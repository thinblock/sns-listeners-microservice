import { InternalServerError } from 'restify-errors';
import to from 'await-to-js';
import IController from '../../../interfaces/utils/IController';
import { IRequest, IResponse } from '../../../interfaces/utils/IServer';
import { ISNSEvent } from '../../../interfaces/utils/IAWS';
import { validateAndConfirmMessage, publishMessage } from '../../../../utils/helpers';
import { Types } from 'mongoose';
import Job from '../../../models/job.model';
import { Next } from 'restify';
import Trigger from '../../../models/trigger.model';
import '../../../models/action.model';
import { config } from '../../../../config/env';
import { oneLine } from 'common-tags';
import { SNS } from 'aws-sdk';

export default class PeriodicalCronListener implements IController {
  public async post(req: IRequest, res: IResponse, next: Next) {
    try {
      const notification: ISNSEvent = JSON.parse(req.body);
      console.log(notification);
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

      const jobs = await Job.find({ active: true, 'trigger.id': trigger._id })
      .populate('actions.action', 'event_name params_schema sns_topic_arn')
      .select('_id trigger.conditions actions')
      .exec();

      req.log.info(oneLine`
        [i] ${jobs.length} events need to be published for trigger: 'cron_periodical_time'
      `);

      // TODO: Make it run in background in a queue
      let successCount = 0;
      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        // TODO: failed jobs goes to retry queue
        const [err, res] = <[Error, SNS.PublishResponse]> await to(
          publishMessage(config().jobConditionEvaluateTopicARN, JSON.stringify(job))
        );

        if (err) {
          req.log.error(`Error while publishing job for: ${job._id}`, err);
          successCount--;
        } else {
          req.log.info(`Published event for job: ${job._id} with MessageId: ${res.MessageId}`);
        }
        successCount++;
      }

      req.log.info(oneLine`
        [i] Published ${jobs.length}/${successCount} events for trigger: 'cron_periodical_time'
      `);

      return res.send('ok');
    } catch (e) {
      req.log.error(e);
      return res.send(new InternalServerError());
    }
  }

}
