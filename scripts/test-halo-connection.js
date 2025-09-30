const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

/**
 * Halo API 连接测试脚本
 */
class HaloConnectionTester {
  constructor() {
    this.baseURL = process.env.HALO_API_BASE_URL;
    this.token = process.env.HALO_API_TOKEN;
    this.enableFallback = process.env.HALO_ENABLE_FALLBACK === 'true';
  }

  async testConnection() {
    console.log('🚀 Testing Halo API connection...\n');

    if (!this.baseURL || !this.token) {
      console.error('❌ Missing required environment variables:');
      console.error('   HALO_API_BASE_URL:', this.baseURL ? '✅' : '❌');
      console.error('   HALO_API_TOKEN:', this.token ? '✅' : '❌');
      console.error('\n💡 Please check your .env.local file');
      return false;
    }

    console.log('📋 Configuration:');
    console.log(`   Base URL: ${this.baseURL}`);
    console.log(`   Token: ${this.token.substring(0, 10)}...`);
    console.log(`   Fallback: ${this.enableFallback ? 'Enabled' : 'Disabled'}\n`);

    // 测试 Halo 服务健康状态
    const healthOk = await this.testHealth();
    if (!healthOk) return false;

    // 测试 API 访问权限
    const apiOk = await this.testApiAccess();
    if (!apiOk) return false;

    // 测试核心功能
    await this.testCoreFunctions();

    console.log('\n🎉 All tests passed! Halo API integration is ready.\n');
    return true;
  }

  async testHealth() {
    console.log('🔍 Testing Halo service health...');
    
    try {
      const response = await axios.get(`${this.baseURL}/actuator/health`, {
        timeout: 5000,
      });

      if (response.data.status === 'UP') {
        console.log('✅ Halo service is healthy');
        return true;
      } else {
        console.log('⚠️  Halo service health check returned:', response.data.status);
        return false;
      }
    } catch (error) {
      console.log('❌ Halo service health check failed:', error.message);
      return false;
    }
  }

  async testApiAccess() {
    console.log('🔍 Testing API access permissions...');
    
    try {
      const response = await axios.get(
        `${this.baseURL}/apis/api.content.halo.run/v1alpha1/posts?size=1`,
        {
          headers: { Authorization: `Bearer ${this.token}` },
          timeout: 5000,
        }
      );

      console.log('✅ API access successful');
      console.log(`📊 Found ${response.data.total} posts in total`);
      return true;
    } catch (error) {
      console.log('❌ API access failed:', error.response?.status, error.response?.data?.message || error.message);
      
      if (error.response?.status === 401) {
        console.log('💡 Check if your API token is valid and has proper permissions');
      } else if (error.response?.status === 403) {
        console.log('💡 Your API token does not have permission to access posts');
      }
      
      return false;
    }
  }

  async testCoreFunctions() {
    console.log('🔍 Testing core API functions...');

    const tests = [
      {
        name: 'Categories',
        url: '/apis/api.content.halo.run/v1alpha1/categories',
      },
      {
        name: 'Tags', 
        url: '/apis/api.content.halo.run/v1alpha1/tags',
      },
      {
        name: 'Site Stats',
        url: '/apis/api.halo.run/v1alpha1/stats/-',
      },
    ];

    for (const test of tests) {
      try {
        await axios.get(`${this.baseURL}${test.url}`, {
          headers: { Authorization: `Bearer ${this.token}` },
          timeout: 3000,
        });
        console.log(`✅ ${test.name} API working`);
      } catch (error) {
        console.log(`⚠️  ${test.name} API failed: ${error.response?.status || 'Network Error'}`);
      }
    }
  }

  async testFrontendIntegration() {
    console.log('🔍 Testing frontend integration...');
    
    try {
      // 测试前端健康检查接口
      const frontendUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const response = await axios.get(`${frontendUrl}/api/halo/health`, {
        timeout: 5000,
      });

      console.log('✅ Frontend integration test passed');
      console.log('📊 Integration status:', response.data.status);
      return true;
    } catch (error) {
      console.log('⚠️  Frontend integration test failed:', error.message);
      console.log('💡 Make sure the Next.js development server is running');
      return false;
    }
  }
}

// 运行测试
async function main() {
  const tester = new HaloConnectionTester();
  const success = await tester.testConnection();
  
  console.log('📝 Next steps:');
  if (success) {
    console.log('   1. Start your Next.js development server: npm run dev');
    console.log('   2. Visit http://localhost:3000/blog to see Halo content');
    console.log('   3. Check http://localhost:3000/api/halo/health for integration status');
  } else {
    console.log('   1. Check your Halo server is running');
    console.log('   2. Verify your API token in Halo admin panel');
    console.log('   3. Update your .env.local file with correct values');
    console.log('   4. Run this test again: npm run halo:test');
  }

  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = HaloConnectionTester;