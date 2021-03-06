import * as path from 'path';
import { EnvConfig } from '../app/interfaces/utils/IConfigSettings';

const env: string = process.env.NODE_ENV || 'development';
const debug: boolean = !!process.env.DEBUG || false;
const isDev: boolean = env === 'development';
const isTestEnv: boolean = env === 'test';
// default settings are for dev environment


const config = (): EnvConfig => {
  const configObj: EnvConfig = {
    name: 'TB-CORE-API',
    env: env,
    test: isTestEnv,
    debug: debug,
    root: path.join(__dirname, '/..'),
    port: 8080,
    db: process.env.TB_JOBS_DB_STRING,
    oAuthSecret: process.env.TB_OAUTH_SECRET || 'asdfasfshdfklsahfsl',
    jobConditionEvaluateTopicARN: process.env.crons_periodical_job_condition_evaluate
  };

  // settings for test environment
  if (env === 'production') {
    configObj.port = 5005;
    configObj.debug = false;
  }

  return configObj;
};

export { config };
