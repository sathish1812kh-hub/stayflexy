---
type: community
cohesion: 0.04
members: 81
---

# Automation Engine

**Cohesion:** 0.04 - loosely connected
**Members:** 81 nodes

## Members
- [[.activateRule()]] - code - src/modules/automation/services/AutomationRuleService.ts
- [[.constructor()_243]] - code - src/common/errors/HttpError.ts
- [[.constructor()_268]] - code - src/modules/automation/services/AutomationRuleService.ts
- [[.constructor()_269]] - code - src/modules/automation/services/WorkflowExecutionService.ts
- [[.create()_28]] - code - src/modules/automation/repositories/PrismaAutomationRuleRepository.ts
- [[.create()_29]] - code - src/modules/automation/repositories/PrismaWorkflowExecutionRepository.ts
- [[.createRule()]] - code - src/modules/automation/services/AutomationRuleService.ts
- [[.deactivateRule()]] - code - src/modules/automation/services/AutomationRuleService.ts
- [[.deleteRule()]] - code - src/modules/automation/services/AutomationRuleService.ts
- [[.evaluate()_1]] - code - src/modules/automation/engines/RuleEngine.ts
- [[.evaluateOne()_1]] - code - src/modules/automation/engines/RuleEngine.ts
- [[.extractConditions()]] - code - src/modules/automation/services/WorkflowExecutionService.ts
- [[.findActiveByTrigger()_1]] - code - src/modules/automation/repositories/PrismaAutomationRuleRepository.ts
- [[.findById()_23]] - code - src/modules/automation/repositories/PrismaAutomationRuleRepository.ts
- [[.findById()_24]] - code - src/modules/automation/repositories/PrismaWorkflowExecutionRepository.ts
- [[.findByIdempotencyKey()_2]] - code - src/modules/automation/repositories/PrismaWorkflowExecutionRepository.ts
- [[.findMany()_9]] - code - src/modules/automation/repositories/PrismaAutomationRuleRepository.ts
- [[.findMany()_10]] - code - src/modules/automation/repositories/PrismaWorkflowExecutionRepository.ts
- [[.findManyFiltered()_2]] - code - src/modules/automation/repositories/PrismaAutomationRuleRepository.ts
- [[.findManyFiltered()_3]] - code - src/modules/automation/repositories/PrismaWorkflowExecutionRepository.ts
- [[.getActionType()]] - code - src/modules/automation/services/WorkflowExecutionService.ts
- [[.getExecution()_1]] - code - src/modules/automation/services/WorkflowExecutionService.ts
- [[.getRule()]] - code - src/modules/automation/services/AutomationRuleService.ts
- [[.hardDelete()_5]] - code - src/modules/automation/repositories/PrismaAutomationRuleRepository.ts
- [[.hardDelete()_6]] - code - src/modules/automation/repositories/PrismaWorkflowExecutionRepository.ts
- [[.listExecutions()]] - code - src/modules/automation/services/WorkflowExecutionService.ts
- [[.listRules()]] - code - src/modules/automation/services/AutomationRuleService.ts
- [[.processEventTrigger()]] - code - src/modules/automation/services/WorkflowExecutionService.ts
- [[.requireRuleInOrg()]] - code - src/modules/automation/services/AutomationRuleService.ts
- [[.requireRuleInOrg()_1]] - code - src/modules/automation/services/WorkflowExecutionService.ts
- [[.retryExecution()]] - code - src/modules/automation/services/WorkflowExecutionService.ts
- [[.triggerRule()]] - code - src/modules/automation/services/WorkflowExecutionService.ts
- [[.update()_15]] - code - src/modules/automation/repositories/PrismaAutomationRuleRepository.ts
- [[.update()_16]] - code - src/modules/automation/repositories/PrismaWorkflowExecutionRepository.ts
- [[.updateRule()]] - code - src/modules/automation/services/AutomationRuleService.ts
- [[.updateStatus()_11]] - code - src/modules/automation/repositories/PrismaAutomationRuleRepository.ts
- [[.updateStatus()_12]] - code - src/modules/automation/repositories/PrismaWorkflowExecutionRepository.ts
- [[.validateConditions()]] - code - src/modules/automation/engines/RuleEngine.ts
- [[ACTION_TYPES]] - code - src/modules/automation/constants/index.ts
- [[AUTOMATION_ERRORS]] - code - src/modules/automation/constants/index.ts
- [[ActionDescriptor_1]] - code - src/modules/automation/types/index.ts
- [[AutomationRule_1]] - code - src/modules/automation/types/index.ts
- [[AutomationRuleService]] - code - src/modules/automation/services/AutomationRuleService.ts
- [[AutomationRuleService.ts]] - code - src/modules/automation/services/AutomationRuleService.ts
- [[AutomationRuleStatusType]] - code - src/modules/automation/types/index.ts
- [[AutomationTriggerTypeType]] - code - src/modules/automation/types/index.ts
- [[BadRequestError_1]] - code - src/common/errors/HttpError.ts
- [[ConditionPredicate]] - code - src/modules/automation/types/index.ts
- [[CreateAutomationRuleData]] - code - src/modules/automation/types/index.ts
- [[CreateWorkflowExecutionData_1]] - code - src/modules/automation/types/index.ts
- [[ExecutionFilter]] - code - src/modules/automation/types/index.ts
- [[PrismaAutomationRuleRepository_1]] - code - src/modules/automation/repositories/PrismaAutomationRuleRepository.ts
- [[PrismaAutomationRuleRepository.ts_1]] - code - src/modules/automation/repositories/PrismaAutomationRuleRepository.ts
- [[PrismaExecution]] - code - src/modules/automation/repositories/PrismaWorkflowExecutionRepository.ts
- [[PrismaRule]] - code - src/modules/automation/repositories/PrismaAutomationRuleRepository.ts
- [[PrismaWorkflowExecutionRepository_1]] - code - src/modules/automation/repositories/PrismaWorkflowExecutionRepository.ts
- [[PrismaWorkflowExecutionRepository.ts_1]] - code - src/modules/automation/repositories/PrismaWorkflowExecutionRepository.ts
- [[RuleEngine]] - code - src/modules/automation/engines/RuleEngine.ts
- [[RuleEngine.ts]] - code - src/modules/automation/engines/RuleEngine.ts
- [[RuleFilter]] - code - src/modules/automation/types/index.ts
- [[UpdateAutomationRuleData]] - code - src/modules/automation/types/index.ts
- [[WorkflowExecution_1]] - code - src/modules/automation/types/index.ts
- [[WorkflowExecutionService]] - code - src/modules/automation/services/WorkflowExecutionService.ts
- [[WorkflowExecutionService.ts]] - code - src/modules/automation/services/WorkflowExecutionService.ts
- [[WorkflowExecutionStatusType]] - code - src/modules/automation/types/index.ts
- [[automationRuleService]] - code - src/modules/automation/container.ts
- [[container.ts_4]] - code - src/modules/automation/container.ts
- [[container.ts_10]] - code - src/modules/hotel/container.ts
- [[executionRepo]] - code - src/modules/automation/container.ts
- [[getHotelService()]] - code - src/app/api/v1/hotels/route.ts
- [[getHotelService()_1]] - code - src/app/api/v1/hotels/[id]/route.ts
- [[getHotelService()_2]] - code - src/app/api/v1/hotels/[id]/settings/route.ts
- [[getHotelService()_3]] - code - src/app/api/v1/hotels/[id]/status/route.ts
- [[hotelRepo]] - code - src/modules/hotel/container.ts
- [[hotelService]] - code - src/modules/hotel/container.ts
- [[index.ts_116]] - code - src/modules/automation/constants/index.ts
- [[index.ts_121]] - code - src/modules/automation/types/index.ts
- [[ruleRepo]] - code - src/modules/automation/container.ts
- [[toExecution()]] - code - src/modules/automation/repositories/PrismaWorkflowExecutionRepository.ts
- [[toRule()]] - code - src/modules/automation/repositories/PrismaAutomationRuleRepository.ts
- [[workflowExecutionService]] - code - src/modules/automation/container.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Automation_Engine
SORT file.name ASC
```

## Connections to other communities
- 13 edges to [[_COMMUNITY_Booking Domain]]
- 10 edges to [[_COMMUNITY_Community 33]]
- 7 edges to [[_COMMUNITY_Community 159]]
- 3 edges to [[_COMMUNITY_API Routes]]
- 3 edges to [[_COMMUNITY_Community 34]]
- 2 edges to [[_COMMUNITY_Community 128]]
- 2 edges to [[_COMMUNITY_Community 239]]
- 1 edge to [[_COMMUNITY_Community 37]]
- 1 edge to [[_COMMUNITY_Community 105]]
- 1 edge to [[_COMMUNITY_Community 55]]
- 1 edge to [[_COMMUNITY_Community 17]]
- 1 edge to [[_COMMUNITY_Controllers & Validation]]
- 1 edge to [[_COMMUNITY_Community 71]]
- 1 edge to [[_COMMUNITY_Payment Domain]]
- 1 edge to [[_COMMUNITY_Community 146]]
- 1 edge to [[_COMMUNITY_Community 182]]
- 1 edge to [[_COMMUNITY_Community 166]]

## Top bridge nodes
- [[BadRequestError_1]] - degree 14, connects to 10 communities
- [[WorkflowExecutionService.ts]] - degree 27, connects to 3 communities
- [[AutomationRuleService.ts]] - degree 26, connects to 3 communities
- [[container.ts_10]] - degree 12, connects to 3 communities
- [[PrismaAutomationRuleRepository.ts_1]] - degree 18, connects to 2 communities