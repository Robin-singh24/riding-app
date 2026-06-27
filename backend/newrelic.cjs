'use strict';


exports.config = {
  app_name: ['GoComet Node Agent'],

  license_key: process.env.NEW_RELIC_LICENSE_KEY,

  
  logging: {
    level: "trace",
  },

  application_logging: {
    forwarding: {
      enabled: true,
    },
  },
};