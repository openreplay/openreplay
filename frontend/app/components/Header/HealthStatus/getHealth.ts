import { healthService } from 'App/services';
import { categoryKeyNames, lastAskedKey, healthResponseKey } from "Components/Header/HealthStatus/const";
import { IServiceStats } from "Components/Header/HealthStatus/HealthStatus";


function mapResponse(resp: Record<string, any>) {
  const services = Object.keys(resp);
  const healthMap: Record<string, IServiceStats> = {};
  services.forEach((service) => {
    healthMap[service] = {
      // @ts-ignore
      name: categoryKeyNames[service],
      healthOk: true,
      subservices: resp[service],
      serviceName: service,
    };
    Object.values(healthMap[service].subservices).forEach((subservice: Record<string, any>) => {
      if (!subservice?.health) healthMap[service].healthOk = false;
    });
  });

  const overallHealth = Object.values(healthMap).every(
    (service: Record<string, any>) => service.healthOk
  );

  return { overallHealth, healthMap };
}

export async function getHealthRequest() {
    const r = await healthService.fetchStatus();
    const healthMap = mapResponse(r);
    const asked = new Date().getTime();
    localStorage.setItem(healthResponseKey, JSON.stringify(healthMap));
    localStorage.setItem(lastAskedKey, asked.toString());
    return { healthMap, asked }
}