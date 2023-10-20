# Sukina Framework
Sukina MVC Framework for Node.js created as replacement for PHP Kohana Framework in migration tasks.
The structure of application code is very similar to Kohana, with routes, Controllers, Models and Views.

# Setup

do 
```
git clone
```
 to working dir (assuming /opt/<app_name> in production env)

do 
```
npm install
```

# Systemd
edit and rename *.service file to be compilant with your app name and working directory
make symlink to /etc/systemd/system

do
```
sudo systemctl start <service_file_name>
sudo systemctl enable <service_file_name>
```
