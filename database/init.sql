-- ORBIS PAS UKI Database Initialization Script
-- This script creates the base schema for the test execution database

-- Create schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS public;

-- Create execplanner table for storing test cases
CREATE TABLE IF NOT EXISTS public.execplanner (
    id SERIAL PRIMARY KEY,
    "JiraID" VARCHAR(50) NOT NULL,
    "FunctionalArea" VARCHAR(255),
    "TestSetName" VARCHAR(255) NOT NULL,
    "TestCaseID" VARCHAR(100) NOT NULL UNIQUE,
    "Description" TEXT,
    "TailoredBy" VARCHAR(255),
    "Browser" VARCHAR(50) DEFAULT 'chromium',
    "Executable" VARCHAR(50) DEFAULT 'yes',
    "DDT" VARCHAR(50),
    "DDTStartNo" INTEGER,
    "DDTEndNo" INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on TestCaseID for faster lookups
CREATE INDEX IF NOT EXISTS idx_testcaseid ON public.execplanner("TestCaseID");
CREATE INDEX IF NOT EXISTS idx_testsettname ON public.execplanner("TestSetName");
CREATE INDEX IF NOT EXISTS idx_jiraid ON public.execplanner("JiraID");

-- Create execution_results table for storing test results
CREATE TABLE IF NOT EXISTS public.execution_results (
    id SERIAL PRIMARY KEY,
    test_case_id VARCHAR(100) NOT NULL,
    test_name VARCHAR(255),
    status VARCHAR(50) NOT NULL,
    duration_ms INTEGER,
    error_message TEXT,
    screenshot_path VARCHAR(500),
    worker_id VARCHAR(100),
    machine_id VARCHAR(100),
    execution_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(test_case_id) REFERENCES public.execplanner("TestCaseID") ON DELETE CASCADE
);

-- Create index on execution results for faster queries
CREATE INDEX IF NOT EXISTS idx_exec_results_status ON public.execution_results(status);
CREATE INDEX IF NOT EXISTS idx_exec_results_timestamp ON public.execution_results(execution_timestamp);
CREATE INDEX IF NOT EXISTS idx_exec_results_worker ON public.execution_results(worker_id);

-- Create execution_summary table for consolidated reports
CREATE TABLE IF NOT EXISTS public.execution_summary (
    id SERIAL PRIMARY KEY,
    execution_run_id VARCHAR(100) UNIQUE,
    total_tests INTEGER,
    passed_tests INTEGER,
    failed_tests INTEGER,
    skipped_tests INTEGER,
    execution_start TIMESTAMP,
    execution_end TIMESTAMP,
    total_duration_ms INTEGER,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Grant permissions to the application user
GRANT USAGE ON SCHEMA public TO orbispasuki_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO orbispasuki_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO orbispasuki_admin;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO orbispasuki_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO orbispasuki_admin;
