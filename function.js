// Učitavanje JSON podataka
// fetch("./datagenerisani2.json")
//   .then((response) => response.json())
//   .then((json) => handleData(json));

window.function = async function (text) {
  let json = JSON.parse(text.value);
  let result = await handleData(json);
  let senddata = result.toString();
  return senddata;
};

// Funkcija za obradu podataka
async function handleData(json) {
  try {
    // Provera da li JSON sadrži neophodne informacije
    if (!json || !json.IGRACI || !Array.isArray(json.IGRACI)) {
      return "Invalid JSON data format: Missing player information.";
    }

    // Dobijanje validnih mečeva na osnovu dostupnosti igrača i termina kluba
    const matches = await getValidMatches(json);

    // Prioritizacija mečeva na osnovu prioriteta kluba
    const prioritizedMatches = await prioritizeMatches(matches, json.PRIORITETI, json);

    console.log("prioritizedMatches", prioritizedMatches);

    // Pronalaženje svih mogućih kombinacija mečeva
    const possibleMatches = findAllPossibleMatches(json.IGRACI, json.TERMINI_KLUBA);
    console.log("Moguće kombinacije mečeva:", possibleMatches);

    return prioritizedMatches;
  } catch (error) {
    return "Error while processing data:" + error;
  }
}

// Funkcija za dobijanje validnih mečeva
function getValidMatches(data) {
  if (!data || !data.IGRACI || !Array.isArray(data.IGRACI)) {
    return "Invalid JSON data: Missing player information.";
  }

  const players = data.IGRACI;
  const matches = [];
  const clubAvailableSlots = data.TERMINI_KLUBA;

  players.forEach((player) => {
    if (parseInt(player.ZELI_IGRATI_MECEVA) > 0) {
      const remainingMatches = parseInt(player.ZELI_IGRATI_MECEVA);
      let playedMatches = 0;

      player.TERMINI_IGRACA.forEach((slot) => {
        const clubSlot = clubAvailableSlots.find((clubSlot) => clubSlot.dan === slot.dan && clubSlot.sat === slot.sat);
        if (clubSlot && playedMatches < remainingMatches) {
          player.POTENCIJALNI_PROTIVNICI.forEach((opponent) => {
            const opponentPlayer = players.find((p) => p.PLAYER_ID === opponent);
            if (opponentPlayer) {
              const opponentSlot = opponentPlayer.TERMINI_IGRACA.find((opponentSlot) => opponentSlot.dan === slot.dan && opponentSlot.sat === slot.sat);
              if (opponentSlot) {
                matches.push({
                  player1ID: player.PLAYER_ID,
                  player2ID: opponent,
                  dayPlayed: slot.dan,
                  hourPlayed: slot.sat,
                  courtID: clubSlot.teren,
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

  return matches;
}

// Funkcija za prioritizaciju mečeva
function prioritizeMatches(matches, priorities, data) {
  const prioritizedMatches = new Set();
  const usedCourts = new Set();

  for (const priority of priorities) {
    switch (priority.id) {
      case "10":
        // Obezbedi da svaki igrač igra minimalno jedan meč
        matches.forEach((match) => {
          if (!prioritizedMatches.has(match) && !usedCourts.has(match.courtID)) {
            prioritizedMatches.add(match);
            usedCourts.add(match.courtID);
          }
        });
        break;
      case "20":
        // Maksimizuj broj mečeva
        matches.forEach((match) => {
          if (!prioritizedMatches.has(match) && !usedCourts.has(match.courtID)) {
            prioritizedMatches.add(match);
            usedCourts.add(match.courtID);
          }
        });
        break;
      case "30":
        // Prioritizuj jutarnje termine (ako je potrebno)
        matches.sort((a, b) => {
          const hourA = parseInt(a.time.split(" ")[1]);
          const hourB = parseInt(b.time.split(" ")[1]);
          const isMorningA = hourA <= 12;
          const isMorningB = hourB <= 12;

          if (isMorningA === isMorningB) {
            return hourA - hourB;
          } else {
            return isMorningB ? -1 : 1;
          }
        });
        matches.forEach((match) => {
          if (!prioritizedMatches.has(match) && !usedCourts.has(match.courtID)) {
            prioritizedMatches.add(match);
            usedCourts.add(match.courtID);
          }
        });
        break;
      case "40":
        // Prioritizuj igrače koji imaju najviše preostalih mečeva
        matches.sort((a, b) => {
          const player1Matches = data.IGRACI.find((player) => player.PLAYER_ID === a.player1ID).PREOSTALO_MECEVA;
          const player2Matches = data.IGRACI.find((player) => player.PLAYER_ID === b.player2ID).PREOSTALO_MECEVA;
          return player2Matches - player1Matches;
        });

        matches.forEach((match) => {
          if (!prioritizedMatches.has(match) && !usedCourts.has(match.courtID)) {
            prioritizedMatches.add(match);
            usedCourts.add(match.courtID);
          }
        });
        break;
      case "50":
        // Prioritizuj igrače koji su prijavili najviše termina
        const playerSlotsCounts = {};

        matches.forEach((match) => {
          playerSlotsCounts[match.player1ID] = (playerSlotsCounts[match.player1ID] || 0) + 1;
          playerSlotsCounts[match.player2ID] = (playerSlotsCounts[match.player2ID] || 0) + 1;
        });

        matches.sort((a, b) => {
          const slotsCountA = playerSlotsCounts[a.player1ID] + playerSlotsCounts[a.player2ID];
          const slotsCountB = playerSlotsCounts[b.player1ID] + playerSlotsCounts[b.player2ID];
          return slotsCountB - slotsCountA;
        });
        matches.forEach((match) => {
          if (!prioritizedMatches.has(match) && !usedCourts.has(match.courtID)) {
            prioritizedMatches.add(match);
            usedCourts.add(match.courtID);
          }
        });
        break;

      default:
        break;
    }
  }

  return Array.from(prioritizedMatches);
}

// Funkcija za pronalaženje svih mogućih kombinacija mečeva
function findAllPossibleMatches(players, clubSlots) {
  const possibleMatches = [];

  // Generisanje svih mogućih parova igrača
  const playerPairs = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      playerPairs.push([players[i], players[j]]);
    }
  }

  // Pronalaženje termina za svaki par igrača
  playerPairs.forEach(([player1, player2]) => {
    clubSlots.forEach((slot) => {
      possibleMatches.push({
        player1ID: player1.PLAYER_ID,
        player2ID: player2.PLAYER_ID,
        dayPlayed: slot.dan,
        hourPlayed: slot.sat,
        courtID: slot.teren,
      });
    });
  });

  return possibleMatches;
}
