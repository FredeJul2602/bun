#!/usr/bin/env bun
// ============================================
// MCP Server - ISTQB Test Manager Tools
// Run with: bun run src/mcp/server.ts
// ============================================

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Create MCP server
const server = new Server(
  {
    name: 'istqb-test-manager-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // ========== Test Estimation Tools ==========
      {
        name: 'estimate_test_effort',
        description: 'Calculate test effort estimation using Test Point Analysis (TPA) or similar methods. Based on ISTQB test estimation techniques.',
        inputSchema: {
          type: 'object',
          properties: {
            testCases: {
              type: 'number',
              description: 'Number of test cases to execute',
            },
            avgExecutionTime: {
              type: 'number',
              description: 'Average execution time per test case in minutes',
              default: 30,
            },
            complexity: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'very_high'],
              description: 'Overall complexity of the system under test',
              default: 'medium',
            },
            testEnvironmentFactor: {
              type: 'number',
              description: 'Environment setup/teardown factor (1.0 = no overhead, 1.5 = 50% overhead)',
              default: 1.2,
            },
            regressionPercentage: {
              type: 'number',
              description: 'Percentage of regression testing needed (0-100)',
              default: 30,
            },
          },
          required: ['testCases'],
        },
      },
      {
        name: 'calculate_test_points',
        description: 'Calculate Test Points for test effort estimation based on function points and quality characteristics',
        inputSchema: {
          type: 'object',
          properties: {
            functionPoints: {
              type: 'number',
              description: 'Number of function points in the application',
            },
            qualityCharacteristics: {
              type: 'array',
              items: { type: 'string' },
              description: 'Quality characteristics to test (e.g., security, performance, usability)',
            },
            testCoverage: {
              type: 'string',
              enum: ['minimal', 'standard', 'thorough', 'exhaustive'],
              description: 'Required test coverage level',
              default: 'standard',
            },
          },
          required: ['functionPoints'],
        },
      },

      // ========== Risk-Based Testing Tools ==========
      {
        name: 'calculate_risk_priority',
        description: 'Calculate risk priority number (RPN) for test prioritization using ISTQB risk-based testing approach',
        inputSchema: {
          type: 'object',
          properties: {
            likelihood: {
              type: 'number',
              description: 'Likelihood of defect occurring (1-5, where 5 is most likely)',
              minimum: 1,
              maximum: 5,
            },
            impact: {
              type: 'number',
              description: 'Business/technical impact if defect occurs (1-5, where 5 is most severe)',
              minimum: 1,
              maximum: 5,
            },
            detectability: {
              type: 'number',
              description: 'Difficulty to detect the defect (1-5, where 5 is hardest to detect)',
              minimum: 1,
              maximum: 5,
            },
            featureName: {
              type: 'string',
              description: 'Name of the feature being assessed',
            },
          },
          required: ['likelihood', 'impact', 'featureName'],
        },
      },
      {
        name: 'prioritize_test_cases',
        description: 'Prioritize a list of test cases based on risk, business value, and dependencies',
        inputSchema: {
          type: 'object',
          properties: {
            testCases: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  riskLevel: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                  businessValue: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                  executionTime: { type: 'number', description: 'Execution time in minutes' },
                },
              },
              description: 'Array of test cases to prioritize',
            },
            strategy: {
              type: 'string',
              enum: ['risk_first', 'value_first', 'quick_wins', 'balanced'],
              description: 'Prioritization strategy to apply',
              default: 'balanced',
            },
          },
          required: ['testCases'],
        },
      },

      // ========== Test Metrics Tools ==========
      {
        name: 'calculate_test_metrics',
        description: 'Calculate key test metrics (pass rate, defect density, test coverage, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            totalTests: { type: 'number', description: 'Total number of test cases' },
            passed: { type: 'number', description: 'Number of passed tests' },
            failed: { type: 'number', description: 'Number of failed tests' },
            blocked: { type: 'number', description: 'Number of blocked tests' },
            notExecuted: { type: 'number', description: 'Number of not executed tests' },
            totalDefects: { type: 'number', description: 'Total defects found' },
            linesOfCode: { type: 'number', description: 'Lines of code (for defect density)' },
            requirements: { type: 'number', description: 'Total requirements' },
            testedRequirements: { type: 'number', description: 'Requirements covered by tests' },
          },
          required: ['totalTests', 'passed', 'failed'],
        },
      },
      {
        name: 'analyze_defect_distribution',
        description: 'Analyze defect distribution by severity, priority, module, and test phase',
        inputSchema: {
          type: 'object',
          properties: {
            defects: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  severity: { type: 'string', enum: ['blocker', 'critical', 'major', 'minor', 'trivial'] },
                  priority: { type: 'string', enum: ['urgent', 'high', 'medium', 'low'] },
                  module: { type: 'string' },
                  phase: { type: 'string', enum: ['unit', 'integration', 'system', 'uat', 'production'] },
                  status: { type: 'string', enum: ['open', 'in_progress', 'resolved', 'closed', 'rejected'] },
                },
              },
              description: 'Array of defects to analyze',
            },
          },
          required: ['defects'],
        },
      },
      {
        name: 'calculate_defect_removal_efficiency',
        description: 'Calculate Defect Removal Efficiency (DRE) - key ISTQB metric for process quality',
        inputSchema: {
          type: 'object',
          properties: {
            defectsFoundBeforeRelease: {
              type: 'number',
              description: 'Defects found during testing (before release)',
            },
            defectsFoundAfterRelease: {
              type: 'number',
              description: 'Defects found in production (after release)',
            },
          },
          required: ['defectsFoundBeforeRelease', 'defectsFoundAfterRelease'],
        },
      },

      // ========== Test Exit Criteria Tools ==========
      {
        name: 'evaluate_exit_criteria',
        description: 'Evaluate if test exit criteria have been met based on ISTQB standards',
        inputSchema: {
          type: 'object',
          properties: {
            criteria: {
              type: 'object',
              properties: {
                minPassRate: { type: 'number', description: 'Minimum pass rate required (%)' },
                maxOpenCritical: { type: 'number', description: 'Maximum open critical defects allowed' },
                maxOpenHigh: { type: 'number', description: 'Maximum open high priority defects allowed' },
                minCoverage: { type: 'number', description: 'Minimum test coverage required (%)' },
                minRequirementsCovered: { type: 'number', description: 'Minimum requirements coverage (%)' },
              },
            },
            actual: {
              type: 'object',
              properties: {
                passRate: { type: 'number' },
                openCritical: { type: 'number' },
                openHigh: { type: 'number' },
                coverage: { type: 'number' },
                requirementsCovered: { type: 'number' },
              },
            },
          },
          required: ['criteria', 'actual'],
        },
      },

      // ========== Test Planning Tools ==========
      {
        name: 'generate_test_schedule',
        description: 'Generate a test schedule based on available resources and test effort',
        inputSchema: {
          type: 'object',
          properties: {
            totalTestHours: {
              type: 'number',
              description: 'Total estimated test effort in hours',
            },
            testers: {
              type: 'number',
              description: 'Number of available testers',
            },
            hoursPerDay: {
              type: 'number',
              description: 'Working hours per day per tester',
              default: 6,
            },
            startDate: {
              type: 'string',
              description: 'Start date (YYYY-MM-DD format)',
            },
            bufferPercentage: {
              type: 'number',
              description: 'Buffer time percentage for unforeseen issues',
              default: 20,
            },
            phases: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  percentage: { type: 'number', description: 'Percentage of total effort' },
                },
              },
              description: 'Test phases and their effort distribution',
            },
          },
          required: ['totalTestHours', 'testers', 'startDate'],
        },
      },
      {
        name: 'calculate_tester_productivity',
        description: 'Calculate and analyze tester productivity metrics',
        inputSchema: {
          type: 'object',
          properties: {
            testersData: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  testsExecuted: { type: 'number' },
                  defectsFound: { type: 'number' },
                  hoursWorked: { type: 'number' },
                },
              },
              description: 'Array of tester performance data',
            },
          },
          required: ['testersData'],
        },
      },

      // ========== Test Reporting Tools ==========
      {
        name: 'generate_test_summary_report',
        description: 'Generate a comprehensive test summary report following ISTQB reporting guidelines',
        inputSchema: {
          type: 'object',
          properties: {
            projectName: { type: 'string' },
            testPhase: { type: 'string', enum: ['unit', 'integration', 'system', 'uat', 'regression'] },
            startDate: { type: 'string' },
            endDate: { type: 'string' },
            totalPlanned: { type: 'number' },
            executed: { type: 'number' },
            passed: { type: 'number' },
            failed: { type: 'number' },
            blocked: { type: 'number' },
            defectsFound: { type: 'number' },
            defectsBySeverity: {
              type: 'object',
              properties: {
                blocker: { type: 'number' },
                critical: { type: 'number' },
                major: { type: 'number' },
                minor: { type: 'number' },
              },
            },
            recommendations: { type: 'string' },
          },
          required: ['projectName', 'testPhase', 'executed', 'passed', 'failed'],
        },
      },
      {
        name: 'calculate_test_progress',
        description: 'Calculate test execution progress and forecast completion',
        inputSchema: {
          type: 'object',
          properties: {
            totalTests: { type: 'number' },
            executedTests: { type: 'number' },
            daysElapsed: { type: 'number' },
            totalDaysPlanned: { type: 'number' },
            dailyCapacity: { type: 'number', description: 'Expected tests per day' },
          },
          required: ['totalTests', 'executedTests', 'daysElapsed', 'totalDaysPlanned'],
        },
      },

      // ========== Traceability Tools ==========
      {
        name: 'analyze_requirements_coverage',
        description: 'Analyze requirements to test case traceability and coverage gaps',
        inputSchema: {
          type: 'object',
          properties: {
            requirements: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  priority: { type: 'string', enum: ['must', 'should', 'could', 'wont'] },
                  testCaseIds: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
          required: ['requirements'],
        },
      },
    ],
  };
});

// ========== Tool Implementation ==========

const complexityFactors: Record<string, number> = {
  low: 0.8,
  medium: 1.0,
  high: 1.3,
  very_high: 1.6,
};

const coverageFactors: Record<string, number> = {
  minimal: 0.5,
  standard: 1.0,
  thorough: 1.5,
  exhaustive: 2.0,
};

const riskLevelScores: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'estimate_test_effort': {
        const testCases = args?.testCases as number;
        const avgTime = (args?.avgExecutionTime as number) || 30;
        const complexity = (args?.complexity as string) || 'medium';
        const envFactor = (args?.testEnvironmentFactor as number) || 1.2;
        const regressionPct = (args?.regressionPercentage as number) || 30;

        const complexityFactor = complexityFactors[complexity] || 1.0;
        const baseEffort = testCases * avgTime * complexityFactor;
        const regressionEffort = baseEffort * (regressionPct / 100);
        const totalMinutes = (baseEffort + regressionEffort) * envFactor;
        const totalHours = totalMinutes / 60;
        const totalDays = totalHours / 8;

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              estimation: {
                baseEffortMinutes: Math.round(baseEffort),
                regressionEffortMinutes: Math.round(regressionEffort),
                environmentOverheadMinutes: Math.round((baseEffort + regressionEffort) * (envFactor - 1)),
                totalMinutes: Math.round(totalMinutes),
                totalHours: Math.round(totalHours * 10) / 10,
                totalDays: Math.round(totalDays * 10) / 10,
              },
              factors: {
                testCases,
                avgExecutionTimeMinutes: avgTime,
                complexityFactor,
                environmentFactor: envFactor,
                regressionPercentage: regressionPct,
              },
              recommendation: totalDays > 20 
                ? 'Consider parallel test execution or automation to reduce timeline'
                : totalDays > 10 
                  ? 'Timeline is substantial - ensure adequate resources are allocated'
                  : 'Timeline appears manageable for a small team',
            }, null, 2),
          }],
        };
      }

      case 'calculate_test_points': {
        const fp = args?.functionPoints as number;
        const qualities = (args?.qualityCharacteristics as string[]) || [];
        const coverage = (args?.testCoverage as string) || 'standard';

        const baseTestPoints = fp * 1.2;
        const qualityMultiplier = 1 + (qualities.length * 0.15);
        const coverageFactor = coverageFactors[coverage] || 1.0;
        const totalTestPoints = baseTestPoints * qualityMultiplier * coverageFactor;

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              testPoints: Math.round(totalTestPoints),
              breakdown: {
                functionPoints: fp,
                baseTestPoints: Math.round(baseTestPoints),
                qualityCharacteristics: qualities,
                qualityMultiplier: Math.round(qualityMultiplier * 100) / 100,
                coverageLevel: coverage,
                coverageFactor,
              },
              estimatedTestCases: Math.round(totalTestPoints / 2),
              estimatedEffortHours: Math.round(totalTestPoints * 0.5),
            }, null, 2),
          }],
        };
      }

      case 'calculate_risk_priority': {
        const likelihood = args?.likelihood as number;
        const impact = args?.impact as number;
        const detectability = (args?.detectability as number) || 3;
        const feature = args?.featureName as string;

        const rpn = likelihood * impact * detectability;
        let riskLevel: string;
        let recommendation: string;

        if (rpn >= 80) {
          riskLevel = 'Critical';
          recommendation = 'Immediate attention required. Extensive testing with multiple techniques.';
        } else if (rpn >= 50) {
          riskLevel = 'High';
          recommendation = 'Prioritize testing. Include in smoke and regression suites.';
        } else if (rpn >= 25) {
          riskLevel = 'Medium';
          recommendation = 'Standard testing coverage. Include in regular test cycles.';
        } else {
          riskLevel = 'Low';
          recommendation = 'Basic testing sufficient. May reduce test coverage if time-constrained.';
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              feature,
              riskPriorityNumber: rpn,
              riskLevel,
              factors: { likelihood, impact, detectability },
              recommendation,
              suggestedTestTypes: rpn >= 50 
                ? ['Functional', 'Integration', 'Performance', 'Security']
                : rpn >= 25 
                  ? ['Functional', 'Integration']
                  : ['Functional'],
            }, null, 2),
          }],
        };
      }

      case 'prioritize_test_cases': {
        const testCases = args?.testCases as Array<{
          id: string;
          name: string;
          riskLevel: string;
          businessValue: string;
          executionTime: number;
        }>;
        const strategy = (args?.strategy as string) || 'balanced';

        const scored = testCases.map(tc => {
          const riskScore = riskLevelScores[tc.riskLevel] || 2;
          const valueScore = riskLevelScores[tc.businessValue] || 2;
          const timeScore = tc.executionTime <= 10 ? 3 : tc.executionTime <= 30 ? 2 : 1;

          let priority: number;
          switch (strategy) {
            case 'risk_first':
              priority = riskScore * 3 + valueScore + timeScore;
              break;
            case 'value_first':
              priority = riskScore + valueScore * 3 + timeScore;
              break;
            case 'quick_wins':
              priority = riskScore + valueScore + timeScore * 3;
              break;
            default: // balanced
              priority = riskScore * 2 + valueScore * 2 + timeScore;
          }

          return { ...tc, priorityScore: priority };
        }).sort((a, b) => b.priorityScore - a.priorityScore);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              strategy,
              prioritizedTestCases: scored.map((tc, idx) => ({
                rank: idx + 1,
                id: tc.id,
                name: tc.name,
                priorityScore: tc.priorityScore,
                riskLevel: tc.riskLevel,
                businessValue: tc.businessValue,
                executionTime: tc.executionTime,
              })),
              summary: {
                total: scored.length,
                criticalRisk: scored.filter(tc => tc.riskLevel === 'critical').length,
                highValue: scored.filter(tc => tc.businessValue === 'critical' || tc.businessValue === 'high').length,
              },
            }, null, 2),
          }],
        };
      }

      case 'calculate_test_metrics': {
        const total = args?.totalTests as number;
        const passed = args?.passed as number;
        const failed = args?.failed as number;
        const blocked = (args?.blocked as number) || 0;
        const notExecuted = (args?.notExecuted as number) || 0;
        const defects = (args?.totalDefects as number) || failed;
        const loc = args?.linesOfCode as number;
        const reqs = args?.requirements as number;
        const testedReqs = args?.testedRequirements as number;

        const executed = passed + failed + blocked;
        const passRate = total > 0 ? (passed / executed) * 100 : 0;
        const executionRate = total > 0 ? (executed / total) * 100 : 0;
        const defectDensity = loc ? (defects / (loc / 1000)) : null;
        const reqCoverage = reqs && testedReqs ? (testedReqs / reqs) * 100 : null;

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              metrics: {
                passRate: `${Math.round(passRate * 10) / 10}%`,
                failRate: `${Math.round((failed / executed) * 1000) / 10}%`,
                executionRate: `${Math.round(executionRate * 10) / 10}%`,
                blockedRate: `${Math.round((blocked / total) * 1000) / 10}%`,
                defectDensity: defectDensity ? `${Math.round(defectDensity * 100) / 100} defects/KLOC` : 'N/A',
                requirementsCoverage: reqCoverage ? `${Math.round(reqCoverage * 10) / 10}%` : 'N/A',
              },
              counts: {
                total,
                executed,
                passed,
                failed,
                blocked,
                notExecuted,
                defectsFound: defects,
              },
              status: passRate >= 95 ? 'Excellent' : passRate >= 85 ? 'Good' : passRate >= 70 ? 'Acceptable' : 'Needs Attention',
            }, null, 2),
          }],
        };
      }

      case 'analyze_defect_distribution': {
        const defects = args?.defects as Array<{
          id: string;
          severity: string;
          priority: string;
          module: string;
          phase: string;
          status: string;
        }>;

        const bySeverity: Record<string, number> = {};
        const byPriority: Record<string, number> = {};
        const byModule: Record<string, number> = {};
        const byPhase: Record<string, number> = {};
        const byStatus: Record<string, number> = {};

        defects.forEach(d => {
          bySeverity[d.severity] = (bySeverity[d.severity] || 0) + 1;
          byPriority[d.priority] = (byPriority[d.priority] || 0) + 1;
          byModule[d.module] = (byModule[d.module] || 0) + 1;
          byPhase[d.phase] = (byPhase[d.phase] || 0) + 1;
          byStatus[d.status] = (byStatus[d.status] || 0) + 1;
        });

        const openDefects = defects.filter(d => d.status === 'open' || d.status === 'in_progress');
        const criticalOpen = openDefects.filter(d => d.severity === 'blocker' || d.severity === 'critical');

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              total: defects.length,
              distribution: {
                bySeverity,
                byPriority,
                byModule,
                byPhase,
                byStatus,
              },
              analysis: {
                openDefects: openDefects.length,
                criticalOpenDefects: criticalOpen.length,
                mostAffectedModule: Object.entries(byModule).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A',
                phaseWithMostDefects: Object.entries(byPhase).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A',
              },
              recommendation: criticalOpen.length > 0 
                ? `${criticalOpen.length} critical/blocker defects need immediate attention before release`
                : openDefects.length > 10 
                  ? 'Consider defect triage session to prioritize fixes'
                  : 'Defect situation is under control',
            }, null, 2),
          }],
        };
      }

      case 'calculate_defect_removal_efficiency': {
        const beforeRelease = args?.defectsFoundBeforeRelease as number;
        const afterRelease = args?.defectsFoundAfterRelease as number;
        const totalDefects = beforeRelease + afterRelease;
        const dre = totalDefects > 0 ? (beforeRelease / totalDefects) * 100 : 100;

        let rating: string;
        let recommendation: string;

        if (dre >= 95) {
          rating = 'Excellent';
          recommendation = 'Testing process is highly effective. Maintain current practices.';
        } else if (dre >= 85) {
          rating = 'Good';
          recommendation = 'Testing is effective but there\'s room for improvement in defect detection.';
        } else if (dre >= 70) {
          rating = 'Acceptable';
          recommendation = 'Consider enhancing test coverage and review processes.';
        } else {
          rating = 'Needs Improvement';
          recommendation = 'Significant improvements needed in testing practices. Consider test process audit.';
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              defectRemovalEfficiency: `${Math.round(dre * 10) / 10}%`,
              rating,
              defects: {
                foundBeforeRelease: beforeRelease,
                foundAfterRelease: afterRelease,
                total: totalDefects,
              },
              recommendation,
              industryBenchmark: 'Typical DRE ranges from 85-95% for mature organizations',
            }, null, 2),
          }],
        };
      }

      case 'evaluate_exit_criteria': {
        const criteria = args?.criteria as Record<string, number>;
        const actual = args?.actual as Record<string, number>;

        const results: Record<string, { passed: boolean; required: number; actual: number }> = {};
        let allPassed = true;

        if (criteria.minPassRate !== undefined) {
          const passed = actual.passRate >= criteria.minPassRate;
          results.passRate = { passed, required: criteria.minPassRate, actual: actual.passRate };
          allPassed = allPassed && passed;
        }

        if (criteria.maxOpenCritical !== undefined) {
          const passed = actual.openCritical <= criteria.maxOpenCritical;
          results.openCritical = { passed, required: criteria.maxOpenCritical, actual: actual.openCritical };
          allPassed = allPassed && passed;
        }

        if (criteria.maxOpenHigh !== undefined) {
          const passed = actual.openHigh <= criteria.maxOpenHigh;
          results.openHigh = { passed, required: criteria.maxOpenHigh, actual: actual.openHigh };
          allPassed = allPassed && passed;
        }

        if (criteria.minCoverage !== undefined) {
          const passed = actual.coverage >= criteria.minCoverage;
          results.coverage = { passed, required: criteria.minCoverage, actual: actual.coverage };
          allPassed = allPassed && passed;
        }

        if (criteria.minRequirementsCovered !== undefined) {
          const passed = actual.requirementsCovered >= criteria.minRequirementsCovered;
          results.requirementsCovered = { passed, required: criteria.minRequirementsCovered, actual: actual.requirementsCovered };
          allPassed = allPassed && passed;
        }

        const failedCriteria = Object.entries(results).filter(([, v]) => !v.passed);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              overallResult: allPassed ? 'PASS - Ready for release' : 'FAIL - Exit criteria not met',
              criteriaResults: results,
              failedCriteria: failedCriteria.map(([k]) => k),
              recommendation: allPassed 
                ? 'All exit criteria met. Proceed with release after stakeholder sign-off.'
                : `Address the following before release: ${failedCriteria.map(([k]) => k).join(', ')}`,
            }, null, 2),
          }],
        };
      }

      case 'generate_test_schedule': {
        const totalHours = args?.totalTestHours as number;
        const testers = args?.testers as number;
        const hoursPerDay = (args?.hoursPerDay as number) || 6;
        const startDate = new Date(args?.startDate as string);
        const buffer = (args?.bufferPercentage as number) || 20;
        const phases = args?.phases as Array<{ name: string; percentage: number }>;

        const effectiveHours = totalHours * (1 + buffer / 100);
        const dailyCapacity = testers * hoursPerDay;
        const totalDays = Math.ceil(effectiveHours / dailyCapacity);

        let currentDate = new Date(startDate);
        const schedule: Array<{ phase: string; startDate: string; endDate: string; hours: number }> = [];

        if (phases && phases.length > 0) {
          phases.forEach(phase => {
            const phaseHours = effectiveHours * (phase.percentage / 100);
            const phaseDays = Math.ceil(phaseHours / dailyCapacity);
            const phaseStart = new Date(currentDate);
            currentDate.setDate(currentDate.getDate() + phaseDays);
            schedule.push({
              phase: phase.name,
              startDate: phaseStart.toISOString().split('T')[0],
              endDate: currentDate.toISOString().split('T')[0],
              hours: Math.round(phaseHours),
            });
          });
        }

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + totalDays);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              schedule: {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                totalDays,
                workingDaysPerWeek: 5,
              },
              effort: {
                baseEffortHours: totalHours,
                bufferHours: Math.round(totalHours * (buffer / 100)),
                totalEffortHours: Math.round(effectiveHours),
              },
              resources: {
                testers,
                hoursPerDayPerTester: hoursPerDay,
                dailyTeamCapacity: dailyCapacity,
              },
              phases: schedule.length > 0 ? schedule : 'No phases defined',
            }, null, 2),
          }],
        };
      }

      case 'calculate_tester_productivity': {
        const testersData = args?.testersData as Array<{
          name: string;
          testsExecuted: number;
          defectsFound: number;
          hoursWorked: number;
        }>;

        const productivity = testersData.map(t => ({
          name: t.name,
          testsPerHour: Math.round((t.testsExecuted / t.hoursWorked) * 10) / 10,
          defectsPerHour: Math.round((t.defectsFound / t.hoursWorked) * 100) / 100,
          defectFindingRate: t.testsExecuted > 0 
            ? `${Math.round((t.defectsFound / t.testsExecuted) * 1000) / 10}%`
            : '0%',
          ...t,
        }));

        const avgTestsPerHour = productivity.reduce((sum, p) => sum + p.testsPerHour, 0) / productivity.length;
        const totalTests = testersData.reduce((sum, t) => sum + t.testsExecuted, 0);
        const totalDefects = testersData.reduce((sum, t) => sum + t.defectsFound, 0);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              individualProductivity: productivity.sort((a, b) => b.testsPerHour - a.testsPerHour),
              teamSummary: {
                totalTestsExecuted: totalTests,
                totalDefectsFound: totalDefects,
                averageTestsPerHour: Math.round(avgTestsPerHour * 10) / 10,
                teamDefectFindingRate: `${Math.round((totalDefects / totalTests) * 1000) / 10}%`,
              },
              topPerformer: productivity[0]?.name || 'N/A',
            }, null, 2),
          }],
        };
      }

      case 'generate_test_summary_report': {
        const data = args as Record<string, unknown>;
        const executed = (data.executed as number) || 0;
        const passed = (data.passed as number) || 0;
        const failed = (data.failed as number) || 0;
        const blocked = (data.blocked as number) || 0;
        const passRate = executed > 0 ? (passed / executed) * 100 : 0;

        const severityData = (data.defectsBySeverity as Record<string, number>) || {};
        const criticalDefects = (severityData.blocker || 0) + (severityData.critical || 0);

        let releaseRecommendation: string;
        if (passRate >= 95 && criticalDefects === 0) {
          releaseRecommendation = 'GO - System is ready for release';
        } else if (passRate >= 85 && criticalDefects <= 2) {
          releaseRecommendation = 'CONDITIONAL GO - Minor issues to address post-release';
        } else {
          releaseRecommendation = 'NO GO - Significant issues must be resolved before release';
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              reportHeader: {
                project: data.projectName,
                testPhase: data.testPhase,
                period: `${data.startDate || 'N/A'} to ${data.endDate || 'N/A'}`,
                generatedAt: new Date().toISOString(),
              },
              executionSummary: {
                planned: data.totalPlanned || executed,
                executed,
                passed,
                failed,
                blocked,
                notRun: ((data.totalPlanned as number) || executed) - executed,
              },
              metrics: {
                passRate: `${Math.round(passRate * 10) / 10}%`,
                executionRate: data.totalPlanned 
                  ? `${Math.round((executed / (data.totalPlanned as number)) * 1000) / 10}%`
                  : '100%',
              },
              defectSummary: {
                total: data.defectsFound || failed,
                bySeverity: severityData,
                criticalAndBlocker: criticalDefects,
              },
              releaseRecommendation,
              additionalRecommendations: data.recommendations || 'None provided',
            }, null, 2),
          }],
        };
      }

      case 'calculate_test_progress': {
        const total = args?.totalTests as number;
        const executed = args?.executedTests as number;
        const daysElapsed = args?.daysElapsed as number;
        const totalDays = args?.totalDaysPlanned as number;
        const dailyCapacity = (args?.dailyCapacity as number) || (executed / daysElapsed);

        const remaining = total - executed;
        const daysRemaining = totalDays - daysElapsed;
        const currentRate = executed / daysElapsed;
        const requiredRate = remaining / daysRemaining;
        const projectedCompletion = Math.ceil(remaining / currentRate);
        const onTrack = requiredRate <= currentRate;

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              progress: {
                completed: `${Math.round((executed / total) * 1000) / 10}%`,
                executed,
                remaining,
                total,
              },
              schedule: {
                daysElapsed,
                daysRemaining,
                totalDaysPlanned: totalDays,
              },
              velocity: {
                currentRate: `${Math.round(currentRate * 10) / 10} tests/day`,
                requiredRate: `${Math.round(requiredRate * 10) / 10} tests/day`,
                projectedDaysToComplete: projectedCompletion,
              },
              status: onTrack ? 'ON TRACK' : 'AT RISK',
              forecast: onTrack 
                ? `Expected to complete ${projectedCompletion - daysRemaining} days early`
                : `Behind schedule by approximately ${projectedCompletion - daysRemaining} days`,
              recommendation: onTrack 
                ? 'Maintain current pace'
                : 'Consider adding resources or reducing scope to meet deadline',
            }, null, 2),
          }],
        };
      }

      case 'analyze_requirements_coverage': {
        const requirements = args?.requirements as Array<{
          id: string;
          name: string;
          priority: string;
          testCaseIds: string[];
        }>;

        const covered = requirements.filter(r => r.testCaseIds && r.testCaseIds.length > 0);
        const notCovered = requirements.filter(r => !r.testCaseIds || r.testCaseIds.length === 0);
        const priorityBreakdown: Record<string, { total: number; covered: number }> = {};

        requirements.forEach(r => {
          if (!priorityBreakdown[r.priority]) {
            priorityBreakdown[r.priority] = { total: 0, covered: 0 };
          }
          priorityBreakdown[r.priority].total++;
          if (r.testCaseIds && r.testCaseIds.length > 0) {
            priorityBreakdown[r.priority].covered++;
          }
        });

        const criticalNotCovered = notCovered.filter(r => r.priority === 'must' || r.priority === 'should');

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              summary: {
                totalRequirements: requirements.length,
                coveredRequirements: covered.length,
                notCoveredRequirements: notCovered.length,
                coveragePercentage: `${Math.round((covered.length / requirements.length) * 1000) / 10}%`,
              },
              byPriority: Object.entries(priorityBreakdown).map(([priority, data]) => ({
                priority,
                total: data.total,
                covered: data.covered,
                coverage: `${Math.round((data.covered / data.total) * 1000) / 10}%`,
              })),
              gaps: {
                criticalGaps: criticalNotCovered.map(r => ({ id: r.id, name: r.name, priority: r.priority })),
                allUncoveredRequirements: notCovered.map(r => ({ id: r.id, name: r.name, priority: r.priority })),
              },
              recommendation: criticalNotCovered.length > 0 
                ? `${criticalNotCovered.length} high-priority requirements lack test coverage - immediate action needed`
                : notCovered.length > 0 
                  ? `${notCovered.length} lower-priority requirements need test coverage`
                  : 'All requirements have test coverage',
            }, null, 2),
          }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      }],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP Server] ISTQB Test Manager Tools - Started and listening on stdio');
}

main().catch((error) => {
  console.error('[MCP Server] Fatal error:', error);
  process.exit(1);
});
