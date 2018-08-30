import { UnauthorizedError, InternalServerError } from 'restify-errors';
import to from 'await-to-js';
import IController from '../../../interfaces/utils/IController';
import { IRequest, IResponse } from '../../../interfaces/utils/IServer';
import { ISNSEvent } from '../../../interfaces/utils/IAWS';
import { validateAndConfirmMessage, publishMessage } from '../../../../utils/helpers';
import Job from '../../../models/job.model';
import { Next } from 'restify';
import Trigger from '../../../models/trigger.model';
import { config } from '../../../../config/env';

export default class PeriodicalCronListener implements IController {
  public async post(req: IRequest, res: IResponse, next: Next) {
    try {
      const notification: ISNSEvent = req.body;
      const [err, result] = <[Error, string]> await to(validateAndConfirmMessage(notification));

      if (err || result !== 'success') {
        return res.send(err || result);
      }

      const trigger = await Trigger.findOne({ event_name: 'cron_periodical_time' });

      if (!trigger) {
        // log error and return success to sns
        req.log.error('Trigger with event_type: cron_periodical_time not found');
        return res.send('ok');
      }

      const jobs = await Job.find({
        active: true,
        trigger: {
          id: trigger._id
        }
      }, ['_id', 'trigger.conditions'])
      .populate('actions.action', 'event_name params_schema').exec();

      // TODO: Make it run in background in a queue
      for (let i = 0; i <= jobs.length; i++) {
        const job = jobs[i];
        // TODO: failed jobs goes to retry queue
        const [err] = await to(
          publishMessage(config.jobConditionEvaluateTopicARN, JSON.stringify(job))
        );

        if (err) {
          req.log.error(`Error while publishing job for: ${job._id}`);
        }
      }

      return res.send('ok');
    } catch (e) {
      req.log.error(e);
      return res.send(new InternalServerError());
    }
  }

}
