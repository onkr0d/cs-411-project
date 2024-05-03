# Setting up and launching the project:  
Note that this is for a windows setup. It might differ slightly for mac users.  
## The basic stuff:  
Clone the repository  
Once the repository is cloned, install the necessary libraries for the web and functions folders through the usage of npm install.  
Install Bun, which will be used for emualting and testing. Link: https://bun.sh/docs/installation.  
  
## Firebase:  
Install firebase and firebase-tools using npm install -g <library_name>.  
Run firebase login to login with the account used for your Firebase project.  
Run firebase projects:list to confirm that the firebase project is there.  
Make sure to include all environment variables in .env files in both web and functions folders.  
  
## Launch:  
Firebase provides commands that can be used to see if what the project would like when launched.  
In order to test only the firebase functions, run bun lint --fix to fix the code, and the bun run build.  
For the full emulator experience, run firebase emulators:start in the web folder.  
  

