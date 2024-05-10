window.function = async function (text) {
    let json = JSON.parse(text.value);

    // Provera da li je JSON objekat validan
    if (!json || typeof json !== 'object') {
        return "Invalid JSON data format: Data is not a valid JSON object.";
    }

    // Provera ostalih neophodnih delova JSON-a
    if (!json.IGRACI || !Array.isArray(json.IGRACI) || !json.TERMINI_KLUBA || !Array.isArray(json.TERMINI_KLUBA) || !json.PRIORITETI || !Array.isArray(json.PRIORITETI)) {
        return "Invalid JSON data format: Missing player information, club slots, or priorities.";
    }

    try {
        if (!json || !json.IGRACI || !Array.isArray(json.IGRACI)) {
            return "Invalid JSON data format: Missing player information.";
        }

        const logString = getValidMatches(json); // Dobijanje logString-a umesto matches
        // Provera da li ima pronađenih mečeva
        //if (logString.length === 0) {
           // return "No valid matches found.";
        //}

        const prioritizedMatches = prioritizeMatches(logString.logString);

        return prioritizedMatches;
    } catch (error) {
        return "Error while processing data: " + error;
    }


    let result = await handleData(json);
    let senddata = await result.toString();
    return senddata;
}

async function handleData(json) {
    try {
        if (!json || !json.IGRACI || !Array.isArray(json.IGRACI)) {
            return "Invalid JSON data format: Missing player information.";
        }
        const logString = getValidMatches(json); // Dobijanje logString-a umesto matches
        const prioritizedMatches = prioritizeMatches(logString.matches, json.PRIORITETI, json);
        return prioritizedMatches;
    } catch (error) {
        return "Error while processing data:" + error;
    }
}

function getValidMatches(data) {
    if (!data || !data.IGRACI || !Array.isArray(data.IGRACI)) {
        return "Invalid JSON data: Missing player information.";
    }

    const players = data.IGRACI;
    const matches = [];
    const clubAvailableSlots = data.TERMINI_KLUBA;

    let logString = ""; // Dodato polje za čuvanje logova

    players.forEach((player) => {
        if (parseInt(player.ZELI_IGRATI_MECEVA) > 0) {
            const remainingMatches = parseInt(player.ZELI_IGRATI_MECEVA);
            let playedMatches = 0;

            logString += `Checking player: ${player.PLAYER_NAME}\n`;

            player.TERMINI_IGRACA.forEach((slot) => {
                logString += `  Checking player's slot: ${slot.dan} ${slot.sat}\n`;

                const clubSlot = clubAvailableSlots.find((clubSlot) => clubSlot.dan === slot.dan && clubSlot.sat === slot.sat);
                if (clubSlot && playedMatches < remainingMatches) {
                    logString += `    Found available club slot: ${slot.dan} ${slot.sat}\n`;

                    player.POTENCIJALNI_PROTIVNICI.forEach((opponent) => {
                        logString += `      Checking opponent: ${opponent}\n`;

                        const opponentPlayer = players.find((p) => p.PLAYER_NAME === opponent);
                        if (opponentPlayer) {
                            const opponentSlot = opponentPlayer.TERMINI_IGRACA.find((opponentSlot) => opponentSlot.dan === slot.dan && opponentSlot.sat === slot.sat);
                            if (opponentSlot) {
                                logString += `        Found match between ${player.PLAYER_NAME} and ${opponent}\n`;
                                matches.push({
                                    player1: player.PLAYER_NAME,
                                    player2: opponent,
                                    time: `${slot.dan} ${slot.sat}`,
                                });
                                playedMatches++;
                            }
                        }
                    });
                }
            });
        }
    });

    logString += "Finished checking matches.";

    // Dodavanje matches u logString kao deo povratne vrednosti
    return { logString: logString, matches: matches };
}
