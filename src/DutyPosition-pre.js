const { config } = require("./config.js");
db=db.getSiblingDB(config.wing);
db.DutyPosition.remove({});
