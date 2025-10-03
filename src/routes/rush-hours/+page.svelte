<script>
  import { onMount } from 'svelte';
  import { Chart } from 'chart.js/auto';
  import { error } from '@sveltejs/kit';
  import { errorAlert } from '$lib/stores/alert';
  import { language } from '$lib/stores/languageStore'; 
  import { translations } from '$lib/i18n'; 

  let canvas = $state();
  let chart;
  let date = $state(new Date().toISOString().split('T')[0]);
  let currentLang = $state('en'); // Imposta la lingua di default

  const labelMap = {
    1: 'quasi vuoto',
    2: 'posti liberi',
    3: 'posti pieni',
    4: 'affollato',
    5: 'sovraffollato'
  };

  // Usa $effect per reattività con lo store 'language'
  $effect(() => {
    const unsubscribe = language.subscribe(lang => {
      currentLang = lang;
    });

    return () => {
      unsubscribe();
    };
  });

  onMount(async () => {
    updateChart();
  });

  async function updateChart() {
    if (!date || !canvas) return;

    try {
      const resp = await fetch(`/API/v2/rush-hours?date=${date}`);
      const linesArr = await (await fetch('/API/v2/trentino-trasporti/lines')).json();
      const lines = Object.fromEntries(linesArr.map(l => [l.routeShortName, "#" + l.routeColor]));

      const rh = await resp.json();
      if (rh.error) throw new Error(rh.error);

      const data = {
        labels: Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')),
        datasets: rh.map((h) => ({
          label: h.line,
          data: h.crowdedness.map((c) =>
            c === null
              ? null
              : [
                  'unknown',
                  'almost_empty',
                  'empty_seats',
                  'seats_full',
                  'crowded',
                  'overcrowded'
                ].indexOf(c)
          ),
          borderColor: lines[h.line] || '#000',
          fill: false,
          tension: 0.1
        }))
      };

      if (chart) chart.destroy();

      chart = new Chart(canvas, {
        type: 'line',
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              min: 0,
              max: 6,
              ticks: {
                stepSize: 1,
                callback(value) {
                  return labelMap[value] ?? '';
                }
              }
            }
          }
        }
      });
    } catch (err) {
      console.error(err);
      errorAlert(err.message || translations[currentLang].loading_error); 
    }
  }
</script>

<h2 class="p-2 text-2xl font-semibold">
  {translations[currentLang].rush_hours}
</h2>

<div class="h-64 w-full rounded-xl bg-white p-4 shadow">
  <canvas bind:this={canvas}></canvas>
</div>

<div class="p-2">
  <h3 class="p-2 font-medium">
    {translations[currentLang].date}
  </h3>
  <input
    type="date"
    class="input w-full"
    bind:value={date}
    onchange={updateChart}
  />
</div>
