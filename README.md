# NHWG-MIMS
## NHWG Member Info Management System
## (WARNING THIS IS UNDER DEVELOPMENT)

Author: Capt Marshall Giguere

MIMS is intended to synchronize member accounts between National database and Wing accounts with the Google G-Suite platform.  Provides the following functions: Add new members, remove members no longer found on National rolls, Suspend expired member accounts until they either fall off the rolls, or renew. MIMS scans the National database and emits batch jobs to perform it's various tasks.  MIMS is intended to be platform agnostic although it is designed primarily with Linux in mind.
**capwatch2.py** replaces the old **capwatch.py** downloader tool.  **capwatch2.py** makes use of the recently released downloader api from eServices.  The eServices release included a PowerShell implementation, capwatch2.py is a Python 3 rewrite and platform agnostic. **NOTE:** you will need to have your WSA and wing commander authorize your use of the api, or web interface.  **capwatch2** requires these additional Python modules: argparse, requests.

#### Requirements:
* O/S: Linux, Windows 7 or above*
* Python 3.0>
* [GAMADV-XTD](https://github.com/taers232c/GAMADV-XTD) Ross Scroggs excellent fork of the [GAM](https://github.com/jay0lee/GAM) tool.
* [MongoDB](https://www.mongodb.com/download-center#community) document database manager 3.4>
* Google G-Suite admin account.

#### Windows additional requirements (includes all of the above)
* Cygwin environment
* Additional Cygwin tools: text-utils, bash, sed, tail, unzip

#### Suggested but not required
* [iPython](http://ipython.readthedocs.io/en/stable/index.html#) - interactive Python environment (makes life so much better for debugging)

#### Optional
* [Studio 3T](https://studio3t.com) - MongoDB browser/editor

Note: Studio 3T is free for non-commercial use.

#### Components:
* capwatch.py - CAPWATCH downloader webdriver client ---> Deprecated <---
* capwatch2.py - CAPWATCH downloader uses the new download API, replaces capwatch.py
* mims.py - MIMS batch job generator
* jobexec - Job executive runs jobs created by MIMS (bash script)
* getTables - Unpack CAPWATCH tables and filter for import into MongoDB (bash script)
* importGoogle - Google data downloader and mongoDB import (bash script)
* importTables - Load CAPWATCH tables into mongoDB (bash script)
* jsonfix.sed - sed (Stream Editor) script used by importGoogle.
* MIMSJobsGen - bash convinence script to generate GAM job files for a list of MIMS classes.

* Note: bash script utilities have not been ported to the Windows environment yet. They work with cygwin bash shell.

## Installation
Each component comes with either a companion configuration file, or the script header contains variables that must be set
prior to running MIMS.  At minimum before you can run MIMS you must install and configure GAMADV-XTD, Python3 and MongoDB. There is no installer for MIMS. Copy all of the MIMS components into a directory under your workspace, MIMS is a good name for it.  Once installed you will need to update the configuation files, credential files and bash shell scripts with defaults appropriate to your installation.  Config vars for the bash scripts are located at the top of each script. Python files will have a conf file and possibly a credentials file, e.g. capwatch2.py includes capwatch2_creds.py and capwatch2_conf.py.

## Additional Python modules required:
* argparse
* pymongo
* requests

The above modules may be installed using Python pip: pip install module_name

## NOTES:
**capwatch.py** is deprecated and is no longer supported. It is retained only as an example of using the selenium webdriver tool. It will probably be removed from the repository at some time in the future.
