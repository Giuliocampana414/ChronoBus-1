<script>
  import Map from './Map.svelte';
  import { TriangleAlert, 
	BusFront, 
	House,
} from '@lucide/svelte';
  import { onMount } from 'svelte';
  import { timetable } from '$lib/stores/timetable';
  import { language } from '$lib/stores/languageStore';
  import { translations } from '$lib/i18n'; 

  let currentLang = $state('en'); // Imposta la lingua di default
  let mapOpen = $state(false);

  let map = $state(undefined);
  let showAnnouncements = $state(false);
  let interval = undefined;
  let line = $state(undefined);

  // Rilevamento della lingua
  $effect(() => {
    const unsubscribe = language.subscribe(lang => {
      currentLang = lang;
    });
    // Cleanup quando il componente viene distrutto
    return () => {
      unsubscribe();
    };
  });

  onMount(async () => {
    if (interval) clearInterval(interval);
    interval = setInterval(async () => {
      updateNearArrivals();
    }, 10000);

    let interval2 = setInterval(() => {
      if (map && map.userLatLon) {
        updateNearArrivals();
        clearInterval(interval2);
      }
    }, 500);
    fetchReports();
  });

  async function updateNearArrivals() {
    let stops = await (
      await fetch(
        `/API/v2/trentino-trasporti/stops/with_arrivals?limit=4&lat=${map && map.userLatLon ? map.userLatLon[0] : 0}&lon=${map && map.userLatLon ? map.userLatLon[1] : 0}`
      )
    ).json();
    const groups = {};

    for (let stop of stops) {
      const key = stop.stopCode.slice(0, -1);

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(stop);
    }
    stopsGroups = Object.values(groups).slice(0, 3);
  }

  let stopsGroups = $state([]);


  $effect(() => {
    stopsGroups;

    const element = document.querySelector('#map');
    if (mapOpen) {
      element.style.height = `${element.scrollHeight}px`;
      setTimeout(() => {
        element.style.height = '0';
      }, 0);
    } else {
      element.style.height = `${element.scrollHeight}px`;
    }
  });

  let announcements = $state([]);

  
  async function fetchReports() {
    try {
      const res = await fetch('/API/v2/official_report', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        announcements = await res.json();
      } else if (res.status === 401) {
        //goto('/login');
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  }

  $effect(() => {
    if ($timetable?.lines?.length > 0) {
      line = $timetable.lines[0].routeId;
    }
  });
</script>

<dialog id="timetableModal" class="modal">
  <div class="modal-box">
    <form method="dialog">
      <button class="btn btn-sm btn-circle btn-ghost absolute top-2 right-2">✕</button>
    </form>
    {#if $timetable}
      <div class="flex flex-wrap gap-2">
        {#each $timetable.lines as l}
          <label class="flex cursor-pointer items-center">
            <input type="radio" name="line" class="hidden" bind:group={line} value={l.routeId} />
            <span
              class="size-7 rounded text-center font-semibold text-white"
              style="border: 2px solid #{l.routeColor};background:{line === l.routeId
                ? '#' + l.routeColor
                : ''}; opacity: {line === l.routeId ? 1 : 0.6};"
            >
              {l.routeShortName}
            </span>
          </label>
        {/each}
      </div>
      <div class="flex flex-wrap gap-2">
        {#each $timetable.timetable.timetables[line]?.map((e) => e.departure_time).sort() as time}
          <span>{time.slice(0, 5)}</span>
        {/each}
      </div>
    {/if}
  </div>
</dialog>

<div
  class="toast toast-top toast-start top-2 left-2 max-w-9/12 gap-1"
  class:hidden={!showAnnouncements}
>
  {#each announcements as announcement}
    <div class="alert alert-warning p-2">
      <span>{announcement.text}</span>
    </div>
  {/each}
</div>

<div class="flex h-full flex-col {mapOpen ? '' : 'p-2'}">
  <div class="transition-all" id="map">
    <div class="flex justify-between">
      <h2 class="text-2xl font-semibold">{translations[currentLang].bus_stop}</h2>
      <button
        class="border-secondary flex h-9 w-9 items-center justify-center rounded-full border"
        class:bg-secondary={showAnnouncements}
        onclick={() => (showAnnouncements = !showAnnouncements)}
      >
        <div class="indicator">
          <span class="indicator-item indicator-bottom badge badge-warning badge-xs m-0.5 px-1">
            {announcements.length}
          </span>
          <TriangleAlert color={showAnnouncements ? '#ffffff' : 'var(--color-secondary'} />
        </div>
      </button>
    </div>
    {#if stopsGroups.length === 0 || map.userLatLon === null}
      <div class="skeleton h-80 w-full"></div>
    {:else}
      {#each stopsGroups as stopsGroup}
        <div>
          <div class="flex">
            {#each stopsGroup as stop}
              <div class="w-full">
                <p class="flex items-center gap-2 whitespace-nowrap">
                  {#if stop.direction}
                    <span aria-label="Andata" title="Andata"><House /></span>
                  {/if}
                  {#if !stop.direction}
                    <span aria-label="Ritorno" title="Ritorno">
                      <BusFront />
                    </span>
                  {/if}
                  {stop.stopName}
                </p>
                <div class="flex gap-1">
                  {#each stop.arrivals as arrival}
                    <div class="flex flex-col items-center justify-center">
                      <div
                        style="background: #{arrival.routeColor}"
                        class="flex size-8 items-center justify-center rounded"
                      >
                        {arrival.routeShortName}
                      </div>
                      <p>{arrival.ritardo}'</p>
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    {/if}
  </div>
  <Map bind:mapOpen bind:map />
</div>
