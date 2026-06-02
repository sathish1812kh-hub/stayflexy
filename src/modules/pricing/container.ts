// FILE: src/modules/pricing/container.ts
import { PrismaPricingRuleRepository } from "./repositories/PrismaPricingRuleRepository";
import { PrismaDynamicRateRepository } from "./repositories/PrismaDynamicRateRepository";
import { PricingRuleService } from "./services/PricingRuleService";
import { DynamicRateService } from "./services/DynamicRateService";

const ruleRepo = new PrismaPricingRuleRepository();
const rateRepo = new PrismaDynamicRateRepository();

export const pricingRuleService = new PricingRuleService(ruleRepo);
export const dynamicRateService = new DynamicRateService(ruleRepo, rateRepo);
