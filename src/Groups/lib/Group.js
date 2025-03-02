// Group Class
// Each subclass group must define:
// const group = <theGroupName>  The name of the Google group
// const memberpipeline = [] an array containing the MongoDB aggregation
//       pipeline used to return potential members.  The pipeline must at
//       minimum produce the field "email" containing the members email address.
// Subclasses may override methods as needed.
//
// Compatibility:
// ECMAScript >=6
// MongoDB >4.2
// MongoShell(mongosh) >1.1.7

// History:
// 07Dec24 DJL Consolidate configuration files for single point changes.
// 28Sep24 MEG Selection $expr selecting GROUP types, it shouldn't
// 27Sep24 MEG Change REGEX in group selection to simple test for speed.
// 26Sep24 MEG Fixed bug where non-NHWG emails were ignored for removal.
// 22Feb24 MEG Clean-up debug output.
// 30Apr23 MEG Group.cleanEmailAddress - fixed replace() regex pattern.
// 15Apr23 MEG Ignore members that are "groups".
// 18Nov22 MEG addMembers() adding duplicates if member listed more than once.
// 12Jul22 MEG Domain name can now be passed as arg to constructor.
// 10Jul22 MEG updateGroup() added, default procedure for updating a group.
// 07Jun22 MEG isGroupMember() not ignoring case when searching group.
// 26May22 MEG Debugged into existence.
// 22Dec21 MEG Created.

import { config, creds } from "../../getConfig.js";
import fs from "fs";
import util from "util";

try {
  if ( DEBUG ) {}
}
catch( exp ) {
  if ( exp instanceof ReferenceError ) {
    var DEBUG = false;
  }
  else {
    throw exp;
  }
}

// Assert debugging function
const Assert = function( conditionalExpression, errorMessage ) {
  if ( ! conditionalExpression ) {
    throw new Error( 'ASSERT FAILED: ' + (
      errorMessage || '' ));
  }
}

// MongoDB collection that contains members on hold status
const holdsCollection = 'GroupHolds';
// MongoDB collection holding all groups & members
const groupsCollectioName = 'GoogleGroups';

let file = null;
function print()
{
  if (! file)
  {
    const now = new Date;
    const timestamp =
          [
            now.getFullYear(),
            ("0" + (now.getUTCMonth() + 1)).substr(-2),
            ("0" + now.getUTCDate()).substr(-2),
            ("0" + now.getUTCHours()).substr(-2),
            ("0" + now.getUTCMinutes()).substr(-2),
            ("0" + now.getUTCSeconds()).substr(-2)
          ].join("");
    const filename = `${config.jobFilePath}/updateGroups${timestamp}.job`;
    file = fs.createWriteStream(filename, { flags: 'w' });
  }

  file.write(util.format.apply(null, arguments));
  file.write("\n");
}

// Group base class
export class Group {
  // Private:
  #myName;
  #db;
  #authList;
  #myDomain;
  #group;
  // Aggregation pipeline to find candidate members for group,
  // supplied by subclasses
  #pipeline = undefined;
  // Name of the collection where the pipeline begins processing,
  // supplied by subclass
  #aggStart;
  // Group member agg pipeline
  #groupMemberPipeline;
  // Aggregation pipeline options
  #agg_options =  { "allowDiskUse" : false };

  dump() {
    print( "#:DUMP: Group: " + this.myGroup,
           "\n#:DUMP: Domain:", this.#myDomain,
           "\n#:DUMP: #pipeline:",this.#pipeline,
           "\n#:DUMP: #aggStart: " + this.#aggStart,
           "\n#:DUMP: #authList:", this.#authList );
  }
  constructor( db, domain, name, pipeline, agg_start ) {
    this.#db = db;
    this.#myName = name;
    this.#myDomain = domain;
    this.#authList = {}; //uses a JS object as a cheap associative set
    this.#group = name + '@' + domain;
    this.#pipeline = pipeline;
    this.#aggStart = agg_start;
    // Ignores managers and groups
    this.#groupMemberPipeline = [
      {
        "$match" : {
          "group" : this.#group,
          "role" : 'MEMBER',
          // Only select USER & OTHER member types
          $expr: { $or: [ { $eq: [ "$type", "USER"] }, { $eq: [ "$type", "OTHER" ] } ] },
          //  Marginally slower using REGEX
          //            "type" : /(USER|OTHER)/,
        }
      },
      {
        "$project" : {
          "email" : "$email",
          "type" : "$type",
        }
      }
    ];
  };

  // Private methods
  async #isActiveMember( capid ) {
    // Check to see if member is active.
    // This function needs to be changed for each group depending
    // on what constitutes "active".
    var m = await this.#db.collection("Member").findOne( { "CAPID": capid, "MbrStatus": "ACTIVE" } );
    return ( m == null )? false : true;
  }

  #isAuth( email ) {
    // Check if the member is in the auth List
    DEBUG && console.log( '# DEBUG:' + this.name + ':' + 'called isAuth():' + email );
    return ( this.#authList[ email ])?  true : false;
  }

  async #isGroupMember( email ) {
    // Check if email is already in the group
    DEBUG && console.log( '# DEBUG:' + this.name + ':' + 'called isGroupMember():' + email );
    let regx = new RegExp( email, 'i' );
    var r = await this.#db.collection("GoogleGroups").findOne( { 'group': this.myGroup, 'email': regx } );
    DEBUG && console.log( '# DEBUG:' + "email:", email, "is group member:", r );
    return ( r == null) ? false : email;

  }

  async #isOnHold( email ) {
    // Checks the "GroupHolds" collection for "email" and "group"
    // for a hold to prevent email address removal.
    // email - the email address to check for
    DEBUG && console.log( '# DEBUG:' + this.name + ':' + 'called isOnHold():' + email );
    let r = await this.#db.collection("GroupHolds").findOne(
      { email: email, group: this.myGroup } );
    return r;
  }

  // Public methods
  get domain() {
    return this.#myDomain;
  }
  get name() {
    return this.#myName;
  }

  cleanEmailAddress( email ) {
    // Change all chars to lowercase and remove offensive chars.
    // all email addresses are assumed to be UTF-8 charset.

    // rex - illegal characters to remove from email address
    const rex = /[\,\;\ ]/g;
    Assert( email, this.name + ":cleanEmailAddress: invalid email" );
    let e = email.toLowerCase();
    e = e.replace( rex, "" );
    return e;
  }

  get myGroup() {
    return this.#group;
  }
  get AuthList() {
    return this.#authList;
  }

  get pipeline() {
    return this.#pipeline;
  }

  async addMembers() {
    // Scans  looking for potential members based on selection pipeline.
    // if member is not currently on the mailing list generate
    // gam command to add member.
    // Creates a set {}, #authList, of members qualified to be on the list.
    // The set #authList contains all of the data returned by the
    // aggregation pipeline for each member.
    // Uses a JS object as a , cheap and dirty set.

    Assert( this.#pipeline, this.name + "::addMembers: Find candidate members pipeline undefined." );
    if ( DEBUG ) {
      console.log( "# DEBUG: Group::addMembers");
      console.log( "# DEBUG: Group:", this.myGroup );
      console.log( '# DEBUG:' + this.name + ':' + 'called addMembers():' );
    }
    let count = 0;
    print( "## Add group members." );
    // Get the list of all qualified potential members for the list
    var cursor = await this.#db.collection(this.#aggStart).aggregate( this.#pipeline, this.#agg_options );
    while ( await cursor.hasNext() ) {
      var m = await cursor.next();
      if (! m || ! m.email) {
        continue;
      }
      let e = this.cleanEmailAddress( m.email );
      if ( ! await this.#isActiveMember( m.CAPID ) ) { continue; }
      // if already in the auth list skip we've done them previously
      // if member is not in auth list add them and issue group add
      // this is to handle duplicates from queries.
      if ( this.#isAuth( e )) { continue; }
      // haven't seen you before add to auth and group
      this.#authList[ e ] = m;
      if ( DEBUG ) { console.log( "# DEBUG: Added to authList:", e ); }

      if ( await this.#isGroupMember( e ) ) { continue; }
      // Print gam command to add new member
      if (DEBUG) { console.log( "# DEBUG: returned from #isGroupMember()" ); }
      print( "# Associated CAPID:", m.CAPID );
      print("gam update group", this.myGroup, "add member", e );
      count++;
    }
    print( "## Added:", count, "members." );
  }

  async removeMembers() {
    // compare each member of the group against the authList,
    // if not generate a gam command to remove member.
    // Check hold status for potential removals.
    // group - group to be updated
    // authList - set of authorized and possible members
    // NOTES:
    // 1. TEMPORAL ORDERING IS IMPORTANT!  "addMembers() must be run prior
    //    to "removeMembers() in order to set the authList.
    // 2. All email addresses must be cleansed prior to use, no uppercase,
    //    no spaces.

    let count = 0;
    if ( DEBUG ) {
      console.log( "# DEBUG: Group::removeMembers" );
      console.log( "# DEBUG: AuthList: ", Object.getOwnPropertyNames( this.AuthList ) );
      console.log( "# DEBUG: Group:", this.myGroup );
      console.log( '# DEBUG:' + this.name + ':' + 'called removeMembers():' );
    }

    print( "## Remove group members." );
    var cursor = await this.#db.collection("GoogleGroups").aggregate( this.#groupMemberPipeline, this.#agg_options );
    while ( await cursor.hasNext() ) {
      var m = await cursor.next();
      if (! m || ! m.email) {
        continue;
      }
      var e = this.cleanEmailAddress( m.email );
      DEBUG && console.log( '# DEBUG:' + this.name + "::removeMembers:called with email:",e);
      if ( this.#isAuth( e )) { continue; }
      if ( await this.#isOnHold( e )) {
        print( '# INFO:', e, 'on hold status, not removed.');
        continue;
      }
      DEBUG && console.log("# DEBUG: Member to be removed:", e );
      print( '# INFO:Remove:', e );
      print( 'gam update group', this.myGroup, 'delete member', e );
      count++;
    }
    print( "## Removed:", count, "members." );
  };
  async updateGroup() {
    // Default update procedure
    // Maybe overridden by subclass
    // if NOAUTORUNGROUP is defined do not run the update, we must not
    // be in batch mode.
    if ( process.env.NOAUTORUNGROUP ) {
      print( "# NOAUTORUNGROUP: enabled, returning without running." );
      return; }
    print( "# Update: " + this.myGroup + " Group" );

    await this.addMembers();
    await this.removeMembers();
  }
}
