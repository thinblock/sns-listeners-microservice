import PeriodicalCronListener from './periodical.listener';
import * as Joi from 'joi';
import { IRoute, IRouteConfig, HttpMethods, AuthStrategies } from '../../../interfaces/utils/Route';

class PeriodicalCronRoute implements IRoute {
  public basePath = '/crons/periodical';
  public controller = new PeriodicalCronListener();

  public getServerRoutes(): IRouteConfig[] {
    return [
      {
        method: HttpMethods.POST,
        auth: AuthStrategies.PUBLIC,
        handler: this.controller.post,
      }
    ];
  }
}

export default PeriodicalCronRoute;
