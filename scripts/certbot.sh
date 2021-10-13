#!/bin/bash

set -e

# This script won't work for aws, as it's black listed

echo -e "This script won't work for aws default domain names associated with public ips, as it's black listed in letsencrypt\nso if you're running on aws with default domain names, please press ctrl+c with in 5 seconds"

sleep 5

homedir=${HOME}
echo please enter your dns name :
read dns_name
echo please enter your email id:
read emai_id
ssh_ansible_user=$(whoami)
certbot_home=/etc/letsencrypt/live/$dns_name


#Check certbot installed or not
if [ $(which certbot) ]; then
    echo "certbot is already installed"
else
    sudo apt-get install -y certbot
fi

sudo certbot certonly --non-interactive --agree-tos -m $emai_id -d $dns_name --standalone

sudo cp $certbot_home/privkey.pem ${homedir}/site.key
sudo cp $certbot_home/fullchain.pem ${homedir}/site.crt
sudo chown -R $ssh_ansible_user:$ssh_ansible_user ${homedir}/site.key ${homedir}/site.crt
sudo chmod 775 ${homedir}/site.crt ${homedir}/site.key


echo -e "Please take a note of these, and fill it up in config file: \
    \n\n    dns_name: $dns_name \n
    cert_path: ${homedir}/site.crt \n
    key_path: ${homedir}/site.key\n
!!! please remove certs after the installation process. or keep it in a safe place."
