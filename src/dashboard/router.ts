import { Router } from "express"
import { readAllRecords } from "../logger/usageLogger.js"
import { renderDashboard } from "./template.js"

export const dashboardRouter = Router()

dashboardRouter.get("/", (_req, res) => {
  const records = readAllRecords()
  res.send(renderDashboard(records))
})
