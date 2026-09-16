/**
 * API 响应辅助函数：统一返回结构（ApiResponse<T>）
 */
import { NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';

export function ok<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json<ApiResponse<T>>({ success: true, data }, { status });
}

export function fail(
  error: string,
  status = 400,
  headers?: Record<string, string>,
): NextResponse<ApiResponse<never>> {
  return NextResponse.json<ApiResponse<never>>({ success: false, error }, { status, headers });
}
