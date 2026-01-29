async function loadTelemetry(){
  const out = document.querySelector('[data-telemetry]');
  const err = document.querySelector('[data-telemetry-error]');
  const stamp = document.querySelector('[data-telemetry-stamp]');
  if (!out) return;

  try{
    if (err) err.textContent = '';
    const res = await fetch('/telemetry.json', { cache: 'no-store' });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const fmtBytes = (b) => {
      if (b == null) return '—';
      const u = ['B','KB','MB','GB','TB'];
      let i=0; let n=b;
      while(n>=1024 && i<u.length-1){ n/=1024; i++; }
      return `${n.toFixed(i===0?0:1)} ${u[i]}`;
    };

    const lines = [];
    lines.push(['HOST', data.hostname]);
    lines.push(['TIME (UTC)', data.time_utc]);
    lines.push(['UPTIME', data.uptime_human]);
    lines.push(['LOAD', data.loadavg?.join(' ') ]);

    if (data.cpu){
      if (data.cpu.model) lines.push(['CPU', data.cpu.model]);
      if (data.cpu.cores != null) lines.push(['CORES', data.cpu.cores]);
      if (data.cpu.usage_percent != null) lines.push(['CPU %', `${data.cpu.usage_percent.toFixed(1)}%`]);
    }

    lines.push(['MEM', `${fmtBytes(data.mem?.used_bytes)} / ${fmtBytes(data.mem?.total_bytes)} used`]);
    lines.push(['DISK /', `${fmtBytes(data.disk_root?.used_bytes)} / ${fmtBytes(data.disk_root?.total_bytes)} used`]);

    if (data.net?.eth0){
      lines.push(['NET RX', fmtBytes(data.net.eth0.rx_bytes)]);
      lines.push(['NET TX', fmtBytes(data.net.eth0.tx_bytes)]);
    }

    if (data.processes?.count != null) lines.push(['PROCS', data.processes.count]);

    if (data.services){
      lines.push(['NGINX', data.services.nginx || 'unknown']);
      if (data.services.tailscale) lines.push(['TAILSCALE', data.services.tailscale]);
      if (data.services.docker) lines.push(['DOCKER', data.services.docker]);
    }

    if (data.llm?.available){
      lines.push(['LLM MODEL', data.llm.model || '—']);
      if (data.llm.contextPercent != null) lines.push(['CONTEXT %', `${Number(data.llm.contextPercent).toFixed(3)}%`]);
      if (data.llm.totalTokens != null) lines.push(['TOKENS (TOTAL)', data.llm.totalTokens]);
      if (data.llm.inputTokens != null) lines.push(['TOKENS (IN)', data.llm.inputTokens]);
      if (data.llm.outputTokens != null) lines.push(['TOKENS (OUT)', data.llm.outputTokens]);
    } else {
      lines.push(['LLM', 'unavailable']);
    }

    out.innerHTML = lines.map(([k,v]) => {
      const vv = (v === undefined || v === null || v === '') ? '—' : String(v);
      return `<div class="row"><div class="k">${k}</div><div class="v">${vv}</div></div>`;
    }).join('');

    if (stamp) stamp.textContent = `Last update: ${data.time_utc}`;
  }catch(e){
    if (err) err.textContent = `Telemetry offline (${e.message}).`;
  }
}

loadTelemetry();
setInterval(loadTelemetry, 5000);
