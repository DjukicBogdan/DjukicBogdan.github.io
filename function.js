
// fetch("./datagenerisani.json")
//   .then((response) => response.json())
//   .then((json) => handleData(json));

window.function = async function (text) {
  let json = JSON.parse(text.value);

  // Provera da li je JSON objekat validan
  if (!json || typeof json !== "object") {
    return "Invalid JSON data format: Data is not a valid JSON object.";
  }

  // Provera ostalih neophodnih delova JSON-a
  if (!json.IGRACI || !Array.isArray(json.IGRACI) || !json.TERMINI_KLUBA || !Array.isArray(json.TERMINI_KLUBA) || !json.PRIORITETI || !Array.isArray(json.PRIORITETI)) {
    return "Invalid JSON data format: Missing player information, club slots, or priorities.";
  }

  let result = await handleData(json);
  let senddata = await JSON.stringify(result);
  //senddata = senddata.replace(/[\])}[{(]/g, '');
  return await senddata.toString();
};

async function handleData(json) {
  try {
    if (!json || !json.IGRACI || !Array.isArray(json.IGRACI)) {
      return "Invalid JSON data format: Missing player information.";
    }
    // Pronalaženje svih mogućih kombinacija mečeva
    const possibleMatches = findAllPossibleMatches(json.IGRACI, json.TERMINI_KLUBA);
    const prioritizedMatches = await prioritizeMatches(possibleMatches, json.PRIORITETI, json);
    return await prioritizedMatches;
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
  const usedCourts = new Set(); // Set za praćenje korišćenih terena

  players.forEach((player) => {
    if (parseInt(player.ZELI_IGRATI_MECEVA) > 0) {
      const remainingMatches = parseInt(player.ZELI_IGRATI_MECEVA);
      let playedMatches = 0;
      player.TERMINI_IGRACA.forEach((slot) => {
        const availableCourts = clubAvailableSlots.filter((clubSlot) => clubSlot.dan === slot.dan && clubSlot.sat === slot.sat);
        availableCourts.forEach((clubSlot) => {
          // Iteriramo kroz sve dostupne terene
          if (playedMatches < remainingMatches) {
            // Provera da li je teren već korišćen
            if (!usedCourts.has(clubSlot.teren) && !usedCourts.has(clubSlot.sat) && !usedCourts.has(clubSlot.dan)) {
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
                    usedCourts.add(clubSlot); // Dodajemo ID terena u set korišćenih terena
                  }
                }
              });
            }
          }
        });
      });
    }
  });

  return matches;
}

function prioritizeMatches(matches, priorities, data) {
  const prioritizedMatches = new Set(); // Koristimo Set za čuvanje jedinstvenih mečeva
  let result;
  for (const priority of priorities) {
    switch (priority.priority) {
      case "1":
        result = ensureAtLeastOneMatch(matches, data);
        break;
      case "2":
        result = maximizeMatches(matches, data);
        break;
      case "3":
        // prioritizeMorningMatches(matches, prioritizedMatches);
        break;
      case "4":
        // prioritizePlayersWithMostRemainingMatches(matches, data, prioritizedMatches);
        break;
      case "5":
        // prioritizePlayersWithMostSlots(matches, prioritizedMatches);
        break;
      default:
        break;
    }
  }

  return Array.from(result.usedCourts); // Pretvaramo Set nazad u niz pre vraćanja rezultata
}

// Funkcija za obezbeđivanje da svaki igrač igra minimalno jedan meč
function ensureAtLeastOneMatch(matches, data) {
  const usedCourts = [];
  const TERMINI_KLUBA = Array.from(data.TERMINI_KLUBA);
  const court = TERMINI_KLUBA;
  court.forEach((c) => (c.isUsed = false));
  for (let i = 0; i < court.length; i++) {
    for (let j = 0; j < matches.length; j++) {
      if (court[i].teren === matches[j].courtID && court[i].dan === matches[j].dayPlayed && court[i].sat === matches[j].hourPlayed) {
        let check = true;
        for (let k = 0; k < usedCourts.length; k++) {
          if (
           
            (matches[j].player1ID === usedCourts[k].player1ID && matches[j].dayPlayed === usedCourts[k].dayPlayed) ||
            (matches[j].player2ID === usedCourts[k].player2ID && matches[j].dayPlayed === usedCourts[k].dayPlayed) ||
            (matches[j].player2ID === usedCourts[k].player1ID && matches[j].dayPlayed === usedCourts[k].dayPlayed) ||
            (matches[j].player1ID === usedCourts[k].player2ID && matches[j].dayPlayed === usedCourts[k].dayPlayed) ||
            (matches[j].player1ID === usedCourts[k].player2ID) ||
            (matches[j].player2ID === usedCourts[k].player1ID) ||
            (matches[j].player1ID === usedCourts[k].player1ID) ||
            (matches[j].player2ID === usedCourts[k].player2ID) 

          ) {
            check = false;
          } else if (matches[j].courtID === usedCourts[k].courtID && matches[j].dayPlayed === usedCourts[k].dayPlayed && matches[j].hourPlayed === usedCourts[k].hourPlayed) {
            check = false;
          } else if (
            matches[j].player1ID === usedCourts[k].player1ID &&
            matches[j].player2ID === usedCourts[k].player2ID &&
            matches[j].courtID === usedCourts[k].courtID &&
            matches[j].dayPlayed === usedCourts[k].dayPlayed &&
            matches[j].hourPlayed === usedCourts[k].hourPlayed
          ) {
            check = false;
          }
        }
        if (check) {
          matches[j].isValid = true;
          usedCourts.push(matches[j]);
          court[i].isUsed = true;
        }
      }
    }
  }

  return { usedCourts, court };
}

// Funkcija za maksimizaciju broja mečeva
function maximizeMatches(matches, data) {
  // svaki igrac igra sa drugim protivnikom neki drugi dan u slobodnom terminu
  const usedCourts = [];
  const TERMINI_KLUBA = Array.from(data.TERMINI_KLUBA);
  const court = TERMINI_KLUBA;
  court.forEach((c) => (c.isUsed = false));
  for (let i = 0; i < court.length; i++) {
    if (court[i].isUsed) {
      continue;
    }
    for (let j = 0; j < matches.length; j++) {
      if (court[i].isValid) {
        continue;
      }
      if (court[i].teren === matches[j].courtID && court[i].dan === matches[j].dayPlayed && court[i].sat === matches[j].hourPlayed) {
        let check = true;
        const player1 = data.IGRACI.find((igrac) => igrac.PLAYER_ID === matches[j].player1ID);
        const player2 = data.IGRACI.find((igrac) => igrac.PLAYER_ID === matches[j].player2ID);
        if (player1.ZELI_IGRATI_MECEVA < 1 || player2.ZELI_IGRATI_MECEVA < 1) {
          continue;
        }
        for (let k = 0; k < usedCourts.length; k++) {
          if (
            (matches[j].player1ID === usedCourts[k].player1ID && matches[j].player2ID === usedCourts[k].player2ID) ||
            (matches[j].player1ID === usedCourts[k].player1ID && matches[j].dayPlayed === usedCourts[k].dayPlayed) ||
            (matches[j].player2ID === usedCourts[k].player2ID && matches[j].dayPlayed === usedCourts[k].dayPlayed) ||
            (matches[j].player2ID === usedCourts[k].player1ID && matches[j].dayPlayed === usedCourts[k].dayPlayed) ||
            (matches[j].player1ID === usedCourts[k].player2ID && matches[j].dayPlayed === usedCourts[k].dayPlayed)
          ) {
            check = false;
          }
          // if (
          //   matches[j].player1ID === usedCourts[k].player1ID ||
          //   matches[j].player2ID === usedCourts[k].player2ID ||
          //   matches[j].player2ID === usedCourts[k].player1ID ||
          //   (matches[j].player1ID === usedCourts[k].player2ID && matches[j].dayPlayed === usedCourts[k].dayPlayed)
          // ) {
          //   check = false;
          // }
          else if (matches[j].courtID === usedCourts[k].courtID && matches[j].hourPlayed === usedCourts[k].hourPlayed) {
            check = false;
          }
        }
        if (check) {
          player1.ZELI_IGRATI_MECEVA = player1.ZELI_IGRATI_MECEVA--;
          player2.ZELI_IGRATI_MECEVA = player1.ZELI_IGRATI_MECEVA--;

          matches[j].isValid = true;
          usedCourts.push(matches[j]);
          court[i].isUsed = true;
        }
      }
    }
  }
  return { usedCourts, court };
}

// Funkcija za prioritetizaciju jutarnjih termina
function prioritizeMorningMatches(matches, prioritizedMatches) {
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

  matches.forEach((match) => prioritizedMatches.add(match));
}

// Funkcija za prioritetizaciju igrača sa najviše preostalih mečeva
function prioritizePlayersWithMostRemainingMatches(matches, data, prioritizedMatches) {
  matches.sort((a, b) => {
    const player1Matches = getPlayerRemainingMatches(a.player1ID, data);
    const player2Matches = getPlayerRemainingMatches(b.player2ID, data);
    return player2Matches - player1Matches;
  });

  matches.forEach((match) => prioritizedMatches.add(match));
}

// Funkcija za prioritetizaciju igrača koji su se prijavili za najviše termina
function prioritizePlayersWithMostSlots(matches, prioritizedMatches) {
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

  matches.forEach((match) => prioritizedMatches.add(match));
}

// Funkcija za dobijanje preostalih mečeva za određenog igrača
function getPlayerRemainingMatches(playerID, data) {
  const player = data.IGRACI.find((player) => player.PLAYER_ID === playerID);
  return player ? player.PREOSTALO_MECEVA : 0;
}
// proveri da li je termin slobodan
function getClubRemainingMatches(match, usedCourts) {
  let usedCourt = Array.from(usedCourts);
  let matches = Array.from(match);
  const isMatch = usedCourt.forEach((c) => {
    matches.forEach((m) => {
      if (m.courtID == c.courtID && m.dayPlayed === c.dayPlayed && m.hourPlayed === c.hourPlayed) {
        return true;
      }
    });
  });
  return false;
}

// proveri da li je termin vec koriscen
function checkClubRemainingMatches(igrac, match, selectedMatches, usedCourts) {
  // let usedCourt = Array.from(usedCourts);
  let selectedMatchArray = Array.from(selectedMatches);
  // proveri da li igrac vec igra neki mec
  let check = null;
  check = selectedMatches.find((c) => {
    return match.courtID === c.courtID && match.dayPlayed === c.dayPlayed && match.hourPlayed === c.hourPlayed && (igrac.PLAYER_ID === c.player1ID || igrac.PLAYER_ID === c.player2ID);
  });
  return check;
}

// Funkcija za pronalaženje svih mogućih kombinacija mečeva
function findAllPossibleMatches(players, clubSlots) {
  const possibleMatches = [];

  // Generisanje svih mogućih parova igrača
  const playerPairs = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const Igrac1 = players[i];
      const Igrac2 = players[j];
      for (let k = 0; k < Igrac1.TERMINI_IGRACA.length; k++) {
        for (let l = 0; l < Igrac2.TERMINI_IGRACA.length; l++) {
          if (Igrac1.TERMINI_IGRACA[k].sat === Igrac2.TERMINI_IGRACA[l].sat && Igrac1.TERMINI_IGRACA[k].dan === Igrac2.TERMINI_IGRACA[l].dan) {
            for (let m = 0; m < Igrac1.POTENCIJALNI_PROTIVNICI.length; m++) {
              for (let n = 0; n < Igrac2.POTENCIJALNI_PROTIVNICI.length; n++) {
                if (Igrac1.POTENCIJALNI_PROTIVNICI[m] === Igrac2.PLAYER_ID) {
                  playerPairs.push([players[i], players[j]]);
                  break;
                }
              }
            }
          }
        }
      }
    }
  }

  // Pronalaženje termina za svaki par igrača
  playerPairs.forEach(([player1, player2]) => {
    clubSlots.forEach((slot) => {
      const terminiIgrac1 = player1.TERMINI_IGRACA;
      const terminiIgrac2 = player2.TERMINI_IGRACA;
      for (let k = 0; k < terminiIgrac1.length; k++) {
        for (let l = 0; l < terminiIgrac2.length; l++) {
          if (terminiIgrac1[k].sat === terminiIgrac2[l].sat && terminiIgrac1[k].dan === terminiIgrac2[l].dan && slot.dan === terminiIgrac1[k].dan && slot.sat === terminiIgrac1[k].sat) {
            possibleMatches.push({
              player1ID: player1.PLAYER_ID,
              player2ID: player2.PLAYER_ID,
              dayPlayed: slot.dan,
              hourPlayed: slot.sat,
              courtID: slot.teren,
              isValid: false,
            });
            break;
          }
        }
      }
    });
  });
  
  return possibleMatches;
}
