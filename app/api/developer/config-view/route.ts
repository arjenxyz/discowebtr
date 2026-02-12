import { NextRequest, NextResponse } from 'next/server';

interface ConfigItem {
  key: string;
  value: string | number | boolean;
  type: 'string' | 'number' | 'boolean' | 'secret';
  description?: string;
  category: string;
}

export async function GET(request: NextRequest) {
  try {
    const configs: ConfigItem[] = [];

    configs.push({
      key: 'TEST_CONFIG',
      value: 'test_value',
      type: 'string',
      description: 'Test configuration',
      category: 'Environment'
    });

    configs.push({
      key: 'NODE_ENV',
      value: process.env.NODE_ENV || 'development',
      type: 'string',
      description: 'Node.js environment',
      category: 'Environment'
    });

    return NextResponse.json({
      configs,
      total: configs.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Config view error:', error);
    return NextResponse.json(
      { error: 'Failed to get configuration data' },
      { status: 500 }
    );
  }
}