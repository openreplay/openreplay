#!/bin/bash

# upgrade.sh v1.10

set -e

cwd=$PWD
openreplay_old_dir=$1
vars_file_path=${openreplay_old_dir}/scripts/helm/vars.yaml

[[ $# == 1 ]] || {
    echo -e "OpenReplay previous version path not given.\nUsage: bash $0 /path/to/previous_openreplay_code_path"
    exit 1
}
[[ -d $1 ]] || {
    echo -e "$1 doesn't exist. Please check the path and run\n \`bash upgrade.sh </path/to/previous/vars.yaml> \`"
}
which ansible &> /dev/null || {
    echo "ansible not found. Are you sure, this is the same machine in which openreplay installed ?"
    exit 100;
}

echo -e"Updating vars.yaml\n"
{
    ansible localhost -m template -a "src=vars_template.yaml dest=vars.yaml" -e @${vars_file_path}
    ansible localhost -m debug -a "var=openreplay_version" -e @${vars_file_path}
} || {
    echo -e "variable file update failed. Update the value from old $vars_file_path to ./vars.yaml by hand"
}

old_version=`grep openreplay_version ${vars_file_path} | cut -d "v" -f 3 | cut -d '"' -f 1`
[[ -z $old_version ]] && {
    old_version=`grep image_tag ${vars_file_path} | cut -d "v" -f 2 | cut -d '"' -f 1`
}
enterprise_edition=`grep enterprise_edition_license ${vars_file_path} | cut -d ":" -f 2 | xargs`
migration(){
    # Ref: https://stackoverflow.com/questions/1527049/how-can-i-join-elements-of-an-array-in-bash
    # Creating an array of versions to migrate.
    db=$1
    migration_versions=(`ls -l db/init_dbs/$db | grep -E ^d | awk -v number=${old_version} '$NF > number {print $NF}' | grep -v create`)
    # Can't pass the space seperated array to ansible for migration. So joining them with ,
    joined_migration_versions=$(IFS=, ; echo "${migration_versions[*]}")

    [[ $joined_migration_versions == "" ]] ||
    {
        echo -e "Starting db migrations"
        echo -e "Migrating versions $migration_versions"

        ansible-playbook -c local migration.yaml -e @vars.yaml -e migration_versions=${joined_migration_versions} --tags $db -v
    }
}

# Patching sendgrid configs for chalice
# This is workaround for chalice email configs.
# Proper variable override will introduce in v1.3.0
patch(){
    vars=(
      EMAIL_HOST
      EMAIL_PORT
      EMAIL_USER
      EMAIL_PASSWORD
      EMAIL_USE_TLS
      EMAIL_USE_SSL
      EMAIL_SSL_KEY
      EMAIL_SSL_CERT
      EMAIL_FROM
    )
    for var in ${vars[@]};do
        # Get old value
        old_val=`grep $var ${openreplay_old_dir}/scripts/helm/app/chalice.yaml| cut -d" " -f4|xargs`
        # Coverting caps env var to small ansible variable.
        # In chalice EMAIL_HOST translates to email_host in vars.yaml
        # Ref: https://stackoverflow.com/questions/2264428/how-to-convert-a-string-to-lower-case-in-bash
        sed -i "s#${var,,}.*#${var,,}: \"$old_val\"#g" vars.yaml
    done
}

# patching chalice with sendgrid configs
patch

installation_type=1
if [[ ${ENTERPRISE} -eq 1 ]]; then
    cp -rf ../../ee/scripts/* ../../scripts/
    sed 's/\(image_tag.*[0-9]\)\(-pr\)\?"$/\1\2-ee"/' vars.yaml
    echo -e "Migrating clickhouse"
    migration clickhouse
fi
echo -e "Migrating postgresql"
migration postgresql

# Re installing apps.
apps=($(ls app/*.yaml|cut -d "." -f1|cut -d '/' -f2))
ansible-playbook -c local setup.yaml -e @vars.yaml -e scale=$installation_type --tags template -v
for app in ${apps[@]}; do
    ansible-playbook -c local setup.yaml -e @vars.yaml -e scale=$installation_type -e app_name=$app --tags app --skip-tags template -v
done
# Installing frontend
ansible-playbook -c local setup.yaml -e @vars.yaml -e scale=$installation_type --tags frontend -v
# Installing nginx
sed -i 's/.* return 301 .*/     # return 301 https:\/\/$host$request_uri;/g' nginx-ingress/nginx-ingress/templates/configmap.yaml
[[ NGINX_REDIRECT_HTTPS -eq 1 ]] && {
sed -i "s/# return 301/return 301/g" nginx-ingress/nginx-ingress/templates/configmap.yaml
}
ansible-playbook -c local setup.yaml -e @vars.yaml -e scale=$installation_type --tags nginx -v
