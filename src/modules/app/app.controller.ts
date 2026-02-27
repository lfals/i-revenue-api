import type { Context } from 'hono'
import { AppService } from './app.service'

export class AppController {
  constructor(private readonly appService: AppService) {}

  getDashboard(c: Context) {
    return c.json(this.appService.getDashboard(), 200)
  }

  createDashboard(c: Context) {
    return c.json(this.appService.createDashboard(), 200)
  }

  replaceDashboard(c: Context) {
    return c.json(this.appService.replaceDashboard(), 200)
  }

  updateDashboard(c: Context) {
    return c.json(this.appService.updateDashboard(), 200)
  }

  deleteDashboard(c: Context) {
    return c.json(this.appService.deleteDashboard(), 200)
  }
}
