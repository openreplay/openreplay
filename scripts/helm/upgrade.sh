/home/ubuntu/openreplay/scripts/helm/vars_template.yaml#!/bin/bash

# upgrade.sh v1.10

cwd=$PWD
vars_file_path=$1/scripts/helm/vars.yaml

[[ $# == 1 ]] || {
    echo -e "OpenReplay previous version path not given.\nUsage: bash $0 /path/to/previous_openreplay_code_path"
    exit 1
}
[[ -f $1 ]] || {
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
enterprise_edition=`grep enterprise_edition_license ${vars_file_path} | cut -d ":" -f 2 | xargs`
migration(){
    # Ref: https://stackoverflow.com/questions/1527049/how-can-i-join-elements-of-an-array-in-bash
    # Creating an array of versions to migrate.
    db=$1
    migration_versions=(`ls -l db/init_dbs/$db_path | grep -E ^d | awk -v number=${old_version} '$NF > number {print $NF}'`)
    # Can't pass the space seperated array to ansible for migration. So joining them with ,
    joined_migration_versions=$(IFS=, ; echo "${migration_versions[*]}")

    [[ $joined_migration_versions == "" ]] ||
    {
        echo -e "Starting db migrations"
        echo -e "Migrating versions $migration_versions"

        ansible-playbook -c local migration.yaml -e vars.yaml -e migration_versions=${joined_migration_versions} --tags $db
    }
}
echo -e "Migrating postgresql"
migration postgresql
echo -e "Migrating clickhouse"
