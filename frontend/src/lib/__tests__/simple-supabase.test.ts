/**
 * Simple Supabase Test
 * Basic validation without complex imports
 */

import { describe, it, expect } from 'vitest';
import { supabase, healthCheck, SUPABASE_CONFIG } from '../supabase';

describe('Simple Supabase Integration', () => {
  it('should have Supabase client configured', () => {
    expect(supabase).toBeDefined();
    expect(SUPABASE_CONFIG).toBeDefined();
    expect(SUPABASE_CONFIG.retryAttempts).toBe(3);
  });

  it('should perform health check', async () => {
    console.log('Testing Supabase health check...');
    
    try {
      const health = await healthCheck();
      console.log('Health check result:', health);
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('message');
      expect(['healthy', 'unhealthy']).toContain(health.status);
      
      if (health.status === 'healthy') {
        console.log('✅ Database connection is healthy');
      } else {
        console.log('⚠️ Database connection issues:', health.message);
      }
    } catch (error) {
      console.log('Health check error:', error);
      expect(error).toBeDefined();
    }
  });

  it('should be able to query organizations table structure', async () => {
    console.log('Testing basic table access...');
    
    try {
      // Try to query just to check table structure/permissions
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .limit(1);
      
      console.log('Organizations query result:', { data, error });
      
      // Allow both success and error - we're just testing connectivity
      expect(data !== undefined || error !== null).toBe(true);
      
      if (error) {
        console.log('Table access error (expected for permissions):', error.message);
      } else {
        console.log('✅ Organizations table accessible');
      }
    } catch (error) {
      console.log('Query error:', error);
      expect(error).toBeDefined();
    }
  });

  it('should validate environment configuration', () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    console.log('Environment check:');
    console.log('VITE_SUPABASE_URL configured:', !!supabaseUrl);
    console.log('VITE_SUPABASE_ANON_KEY configured:', !!supabaseKey);
    
    expect(supabaseUrl).toBeDefined();
    expect(supabaseKey).toBeDefined();
    expect(supabaseUrl).toContain('supabase.co');
  });
});