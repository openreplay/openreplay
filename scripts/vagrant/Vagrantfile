# -*- mode: ruby -*-
# vi: set ft=ruby :

# All Vagrant configuration is done below. The "2" in Vagrant.configure
# configures the configuration version (we support older styles for
# backwards compatibility). Please don't change it unless you know what
# you're doing.
Vagrant.configure("2") do |config|
  # The most common configuration options are documented and commented below.
  # For a complete reference, please see the online documentation at
  # https://docs.vagrantup.com.

  # Every Vagrant development environment requires a box. You can search for
  # boxes at https://vagrantcloud.com/search.
  config.vm.box = "peru/ubuntu-20.04-server-amd64"
  config.vm.define "openreplay-dev"

  # Disable automatic box update checking. If you disable this, then
  # boxes will only be checked for updates when the user runs
  # `vagrant box outdated`. This is not recommended.
  # config.vm.box_check_update = false

  # Create a forwarded port mapping which allows access to a specific port
  # within the machine from a port on the host machine. In the example below,
  # accessing "localhost:8080" will access port 80 on the guest machine.
  # NOTE: This will enable public access to the opened port
  # config.vm.network "forwarded_port", guest: 80, host: 8080

  # Create a forwarded port mapping which allows access to a specific port
  # within the machine from a port on the host machine and only allow access
  # via 127.0.0.1 to disable public access
  # config.vm.network "forwarded_port", guest: 80, host: 8080, host_ip: "127.0.0.1"

  # Create a private network, which allows host-only access to the machine
  # using a specific IP.
  config.vm.network "private_network", type: "dhcp"

  # Create a public network, which generally matched to bridged network.
  # Bridged networks make the machine appear as another physical device on
  # your network.
  # config.vm.network "public_network"

  # Share an additional folder to the guest VM. The first argument is
  # the path on the host to the actual folder. The second argument is
  # the path on the guest to mount the folder. And the optional third
  # argument is a set of non-required options.
  config.vm.synced_folder "./", "/home/vagrant/openreplay-dev/"

  # Provider-specific configuration so you can fine-tune various
  # backing providers for Vagrant. These expose provider-specific options.
  # Example for VirtualBox:
  #
  config.vm.provider "virtualbox" do |vb|
    # Display the VirtualBox GUI when booting the machine
    vb.gui = false

    # Customize the amount of memory on the VM:
    vb.cpus = "2"
    vb.memory = "4096"
  end
  #
  # View the documentation for the provider you are using for more
  # information on available options.

  # Enable provisioning with a shell script. Additional provisioners such as
  # Ansible, Chef, Docker, Puppet and Salt are also available. Please see the
  # documentation for more information about their specific syntax and use.
  config.vm.provision "shell", inline: <<-SHELL
    set -x

    IP_ADDR=`ip r | tail -n1 | awk '{print $NF}'`

    # Updating host domainName
    grep -q openreplay.local /etc/hosts || echo $IP_ADDR openreplay.local >> /etc/hosts && sudo sed -i "s/.*openreplay.local/${IP_ADDR} openreplay.local/g" /etc/hosts; grep openreplay.local /etc/hosts

    apt-get update
    apt-get install -y git curl
    curl -fsSL https://get.docker.com | sh -
    usermod -aG docker vagrant

    git clone https://github.com/openreplay/openreplay infra
    cd infra/scripts/helmcharts

    # changing container runtime for k3s to docker
    sudo -u vagrant git checkout -- init.sh
    sed -i 's/INSTALL_K3S_EXEC=\\(.*\\)\\\"/INSTALL_K3S_EXEC=\\1 --docker\\\"/g' init.sh

    DOMAIN_NAME=openreplay.local bash init.sh
    cp -rf /root/.kube /home/vagrant/
    cp -rf /home/vagrant/infra/scripts/helmcharts/vars.yaml /home/vagrant/openreplay-dev/openreplay/scripts/helmcharts/vars.yaml
    chown -R vagrant:vagrant /home/vagrant

    cat <<EOF

      ################################################
      Openreplay Dev environment preparation completed.
      ################################################

      Steps to do:

        Add ip address from about output to your local resolver

        ## Mac (Paste the following command in terminal)

        sudo -- sh -c 'grep -q openreplay.local /etc/hosts || echo $IP_ADDR openreplay.local >> /etc/hosts && sudo sed -i "s/.*openreplay.local/${IP_ADDR} openreplay.local/g" /etc/hosts; grep openreplay.local /etc/hosts'

        ## Linux (Paste the following command in terminal)

        sudo -- sh -c 'grep -q openreplay.local /etc/hosts || echo $IP_ADDR openreplay.local >> /etc/hosts && sudo sed -i "s/.*openreplay.local/${IP_ADDR} openreplay.local/g" /etc/hosts; grep openreplay.local /etc/hosts'

        ## Windows

        Use the following instructions if you’re running Windows 10 or Windows 8:

            Press the Windows key.
            Type Notepad in the search field.
            In the search results, right-click Notepad and select Run as administrator.
            From Notepad, open the following file:
            c:\\Windows\\System32\\Drivers\\etc\\hosts
            add the below line in the hosts file
            $IP_ADDR openreplay.local
            Select File > Save to save your changes.

      To Access Openreplay:
        - Open your browser and go to "http://openreplay.local"

    EOF
  SHELL
end
