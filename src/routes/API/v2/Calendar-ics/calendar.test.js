import { describe, it, expect, vi } from 'vitest';
import { POST } from './+server.js'; 

const icsValido = `
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test Corp//NONSGML v1.0//EN
BEGIN:VEVENT
UID:12345@test.com
DTSTAMP:20251026T080000Z
DTSTART:20251026T100000Z
DTEND:20251026T113000Z
SUMMARY:Evento di Test
DESCRIPTION:Questa è una descrizione di prova.
LOCATION:Ufficio
END:VEVENT
END:VCALENDAR
`.trim();

const icsNonValido = 'Questo non è un file ics valido';

describe('POST /Calendar-ics', () => {

    it('dovrebbe processare un file .ics valido e restituire gli eventi formattati', async () => {

        const mockRequest = {
            text: async () => icsValido
        };

        const response = await POST({ request: mockRequest });
        const body = await response.json();


        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.eventCount).toBe(1);
        expect(body.events).toBeInstanceOf(Array);
        expect(body.events.length).toBe(1);


        const event = body.events[0];
        expect(event.uid).toBe('12345@test.com');
        expect(event.title).toBe('Evento di Test');
        expect(new Date(event.start)).toEqual(new Date('2025-10-26T10:00:00.000Z'));
        expect(new Date(event.end)).toEqual(new Date('2025-10-26T11:30:00.000Z'));
        expect(event.location).toBe('Ufficio');
        expect(event.description).toBe('Questa è una descrizione di prova.');
    });

    it('corpo della richiesta è vuoto', async () => {
        // Arrange
        const mockRequest = {
            text: async () => '' // Corpo vuoto
        };

        // Act
        const response = await POST({ request: mockRequest });
        const body = await response.json();

        // Assert
        expect(response.status).toBe(400);
        expect(body.error).toBeDefined();
        expect(body.error).toContain('Corpo della richiesta vuoto');
    });

    it('il contenuto .ics non è valido', async () => {

        const mockRequest = {
            text: async () => icsNonValido
        };

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const response = await POST({ request: mockRequest });
        const body = await response.json();

        expect(response.status).toBe(500);
        expect(body.success).toBe(false);
        expect(body.error).toBeDefined();
        expect(body.error).toContain('Errore nel parsing del file');

        expect(consoleSpy).toHaveBeenCalled();
        
        consoleSpy.mockRestore();
    });

});