# NHWG-MIMS
## New Hampshire Wing Member Info Management System
## (WARNING THIS IS UNDER DEVELOPMENT)

Author: Capt Marshall Giguere

MIMS is intended to synchronize member accounts between National database and Wing accounts.  Provides the following functions: Add new members, remove members no longer found on National rolls, Suspend expired member accounts until they either fall off the rolls, or renew. MIMS scans the National database and emits batch jobs to perform it's various tasks.  MIMS is intended to be platform agnostic although it is designed primarily with Linux in mind.

#### Requirements:
* O/S: Linux, Windows 7 or above
* Python 3.0>
* [GAMADV-X](https://github.com/taers232c/GAMADV-X) Ross Scroggs excellent fork of the [GAM](https://github.com/taers232c/GAM) tool.
* MongoDB document database manager 3.4>
* Selenium Python webdriver module
* Chrome webdriver or equivalent browser webdriver
#### Optional
* [Studio 3T](https://studio3t.com) - MongoDB browser/editor

#### Components:
* capwatch.py - CAPWATCH downloader webdriver client
* capwatch_conf.py - capwatch.py config file
* mims.py - MIMS batch job generator
* jsched - Batch job scheduler/executor (TBD)
