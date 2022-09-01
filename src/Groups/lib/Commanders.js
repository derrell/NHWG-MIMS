// Group: commanders
// Group contains all commanders and deputies

// Default constructor args: group, memberpipeline, start_agg

// History:
// 06Jul22 MEG Group leaf class includes mainline.
// 29May22 MEG Created

// Load my super class definition
load( './lib/Group.js');

// base name of the group
const group = 'commanders';

// Name of collection on which the aggregation pipeline beings search
const pipeline_start = 'DutyPosition';

// MongoDB aggregation pipeline to find potential commanders.
// The query excludes assistants.
const memberpipeline = [
    { 
        "$match" : { 
            "Duty" : /^(Commander|vice commander|Deputy Commander|Chief of staff|Director of op|inspector general)/i, 
            "Asst" : 0,
        }
    }, 
    { 
        "$lookup" : { 
            "from" : "Google", 
            "localField" : "CAPID", 
            "foreignField" : "customSchemas.Member.CAPID", 
            "as" : "google"
        }
    }, 
    { 
        "$unwind" : { 
            "path" : "$google", 
            "preserveNullAndEmptyArrays" : false
        }
    }, 
    { 
        "$match" : { 
            "google.suspended" : false
        }
    }, 
    { 
        "$project" : { 
            "CAPID" : 1, 
            "Name" : "$google.name.fullName", 
            "Duty" : 1, 
            "email" : "$google.primaryEmail"
        }
    }
];

// commanders group
class Commanders extends Group {
    constructor( domain = wing_domain, groupname = group, pipeline = memberpipeline,
	         start_agg = pipeline_start ) {
	super( domain, groupname, pipeline, start_agg );
    }
}

// Main

let theGroup = new Commanders();
theGroup.updateGroup();


