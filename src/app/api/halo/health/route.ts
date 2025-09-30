import { NextRequest, NextResponse } from "next/server";
import { hybridDataService } from "@/services/hybrid-data-service";
import { isHaloAvailable } from "@/lib/halo-client";

export async function GET(request: NextRequest) {
  try {
    const status = hybridDataService.getDataSourceStatus();
    const isConnected = await hybridDataService.testHaloConnection();

    const healthData = {
      timestamp: new Date().toISOString(),
      status: isConnected ? "healthy" : "degraded",
      halo: {
        available: status.haloAvailable,
        connected: isConnected,
        currentSource: status.currentSource,
        fallbackEnabled: status.fallbackEnabled,
      },
      version: process.env.npm_package_version || "unknown",
    };

    // 如果 Halo 不可用但有降级，状态为 degraded
    const httpStatus = isConnected ? 200 : status.fallbackEnabled ? 200 : 503;

    return NextResponse.json(healthData, { status: httpStatus });
  } catch (error) {
    console.error("Health check failed:", error);

    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        halo: {
          available: false,
          connected: false,
          currentSource: "unavailable",
          fallbackEnabled: process.env.HALO_ENABLE_FALLBACK === "true",
        },
      },
      { status: 503 }
    );
  }
}