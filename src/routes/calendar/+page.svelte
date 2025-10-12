<script>
    import { onMount } from 'svelte';
    import { Calendar } from '@fullcalendar/core';
    import dayGridPlugin from '@fullcalendar/daygrid';
    import interactionPlugin from '@fullcalendar/interaction';
    import itLocale from '@fullcalendar/core/locales/it';
    import { language } from '$lib/stores/languageStore';
    import { translations } from '$lib/i18n';

    let events = []; 
    let calendarEl;
    let calendar; 

    let isLoading = $state(false);
    let errorMessage = $state('');

    $effect(() => {
        if (calendar) {
            calendar.setOption('locale', $language);
        }
    });

    onMount(() => {
        const savedEventsJSON = localStorage.getItem('calendarioEvents');
        if (savedEventsJSON) {
            try {
                const savedEvents = JSON.parse(savedEventsJSON);
                events = savedEvents;
                console.log(translations[$language].log_events_loaded);
            } catch (e) {
                console.error(translations[$language].error_parsing_events, e);
                localStorage.removeItem('calendarioEvents');
            }
        }
        
        calendar = new Calendar(calendarEl, {
            plugins: [dayGridPlugin, interactionPlugin],
            locales: [itLocale],      // Rende disponibili le lingue importate
            locale: $language,        // Imposta la lingua iniziale dallo store
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,dayGridWeek,dayGridDay'
            },
            events: events 
        });

        calendar.render();
    });

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) {
            return;
        }

        isLoading = true;
        errorMessage = '';

        const reader = new FileReader();
        reader.readAsText(file);

        reader.onload = async (event) => {
            const fileContent = event.target.result;
            try {
                const response = await fetch('/API/v2/Calendar-ics', {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/calendar' },
                    body: fileContent
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'Errore sconosciuto dal server.');
                }
                
                const formattedEvents = data.events;
                localStorage.setItem('calendarioEvents', JSON.stringify(formattedEvents));
                console.log(translations[$language].log_events_saved);
                
                calendar.removeAllEvents();
                calendar.addEventSource(formattedEvents);
            } catch (error) {
                console.error(translations[$language].error_backend_call, error);
                errorMessage = error.message;
                calendar.removeAllEvents();
            } finally {
                isLoading = false;
            }
        };

        reader.onerror = () => {
            errorMessage = translations[$language].error_reading_file;
            isLoading = false;
        }
    };

    const clearCalendar = () => {
        if (calendar) {
            calendar.removeAllEvents();
        }
        localStorage.removeItem('calendarioEvents');
        const fileInput = document.getElementById('ics-upload');
        if(fileInput) fileInput.value = '';
        console.log(translations[$language].log_calendar_cleared);
    };
</script>

<main class="container">
    <h1 class="text-2xl font-semibold">{translations[$language].upload_calendar}</h1>
    <p>{translations[$language].text_calendar}</p>
    
    <div class="input-area">
        <label for="ics-upload">{translations[$language].choose_file}</label>
        <input 
            type="file" 
            id="ics-upload" 
            accept=".ics,text/calendar" 
            onchange={handleFileSelect} disabled={isLoading} />
        
        <button onclick={clearCalendar} style="margin-left: 20px;">{translations[$language].clear_calendar}</button>

        {#if isLoading}
            <span class="loading-message">{translations[$language].loading}</span>
        {/if}
    </div>

    {#if errorMessage}
        <div class="error-message">
            <strong>{translations[$language].error}:</strong> {errorMessage}
        </div>
    {/if}
    
    <hr/>
    <div bind:this={calendarEl}></div>
</main>

<style>
    .container {
        max-width: 900px;
        margin: 2rem auto;
        padding: 1rem;
        font-family: sans-serif;
		padding-bottom: 120px; 
    }
    .input-area {
        margin: 1.5rem 0;
        padding: 1rem;
        background-color: rgb(0, 0, 0);
        border-radius: 8px;
        display: flex;
        align-items: center;
    }
    label {
        font-weight: bold;
        margin-right: 10px;
    }
    hr {
        margin: 2rem 0;
    }
    .loading-message {
        margin-left: 1rem;
        font-style: italic;
        color: #555;
    }
    .error-message {
        padding: 1rem;
        background-color: #ffdddd;
        border: 1px solid #ff8888;
        color: #d8000c;
        border-radius: 8px;
        margin-bottom: 1.5rem;
    }
	:global(.fc-event-title) {
        white-space: normal !important; /* Permette al testo di andare a capo */
        overflow-wrap: break-word;      /* Gestisce le parole lunghe che non si spezzano */
    }
</style>