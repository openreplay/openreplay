### Installation

- Vagrant: [https://www.vagrantup.com/downloads](https://www.vagrantup.com/downloads)
- VirtualBox: [https://www.virtualbox.org/wiki/Downloads](https://www.virtualbox.org/wiki/Downloads)

### Configuration

```bash
mkdir openreplay-contributions
cd openreplay-contributions
git clone https://github.com/openreplay/openreplay -b dev
cp -rf openreplay/scripts/vagrant/ .
vagrant up
```

### To access OpenReplay instance

```bash
Add ip address from about output to your local resolver

## Mac/Linux

Copy paste the command from the vagrant output

## Windows

Use the following instructions if you’re running Windows 10 or Windows 8:
    Press the Windows key.
    Type Notepad in the search field.
    In the search results, right-click Notepad and select Run as administrator.
    From Notepad, open the following file:
    c:\Windows\System32\Drivers\etc\hosts
    add the below line in the hosts file
    <ip address from vagrant output> openreplay.local
    Select File > Save to save your changes.

**Open the below URL and create an account**
http://openreplay.local/signup
```

### Notes

It’ll be a good practice to take a snapshot once the initial setup is complete, so that if something is not working as expected, you can always fall back to a stable known version.
```bash
cd openreplay-dev
vagrant snapshot save <openreplay-version-base>
# For example
vagrant snapshot save openreplay-160-base
```

```bash
# To restore the snapshot
cd openreplay-dev
vagrant snapshot restore openreplay-160-base
```

<aside>
💡 If the base VM is deleted, the snapshot won’t be available.
</aside>
