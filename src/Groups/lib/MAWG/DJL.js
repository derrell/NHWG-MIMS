// Derrell's test group

// Load my super class definition
import { Group } from '../Group.js';
import { config } from "../../../getConfig.js";

// Name of collection on which the aggregation pipeline beings search
const pipeline_start = 'Member';

// MongoDB aggregation pipeline to find potential group members
function makePipeline(unit, domain, groupname)
{
  let pipeline =
      [
        {
	      $match:
          {
	        CAPID: 145669
	      }
        },
        {
	      $lookup:
          {
	        "from" : "Google",
	        "localField" : "CAPID", 
	        "foreignField" : "customSchemas.Member.CAPID", 
	        "as" : "google"
	      }
        },
        {
	      $unwind:
          {
	        "path" : "$google", 
	        "preserveNullAndEmptyArrays" : false
	      }
        },
        {
	      $match:
          {
	        "google.suspended": false,
	      }
        },
        {
	      $project:
          {
            "_id" : 0,
	        "CAPID" : 1,
	        "Name" : "$google.name.fullName", 
	        "email" : "$google.primaryEmail",    
	      }
        },
      ];
  
  return pipeline;
}

export default class DJL extends Group
{
  constructor(db, groupname, unit = "")
  {
    const domain = config.domain;
    const pipeline = makePipeline(unit, domain, groupname);
    const start_agg = pipeline_start;
    
	super( db, domain, groupname, pipeline, start_agg );
  }
}
