let maxCombination = 0;
let countIterations = 0;
let timeLimit = 1000;
let countNumberOfPlayers = 0;
async function generateMatches(players, matches, currentMatch, courts) {
  if (currentMatch.length > 0) {
  }
  if (currentMatch.length === maxCombination) {
    // All players processed, add the current match combination
    matches.push([...currentMatch]);
    return;
  }
  const playerIndex = currentMatch.length;
  const player1 = players[playerIndex];
  let checkDouble = false;
  for (let player2 of player1.POTENCIJALNI_PROTIVNICI) {
    player2 = players.find((p) => p.PLAYER_ID === player2);
    if (!player2) {
      return;
    }
    for (let i = 0; i < currentMatch.length; i++) {
      if (currentMatch[i].player1ID === player2.PLAYER_ID || currentMatch[i].player2ID === player2.PLAYER_ID) {
        checkDouble = true;
        return;
      }
    }
    if (!checkDouble && player1.PREOSTALO_MECEVA > 0 && player2.PREOSTALO_MECEVA > 0 && player1.ZELI_IGRATI_MECEVA > 0 && player2.ZELI_IGRATI_MECEVA > 0) {
      let termini = [];
      for (let i = 0; i < player1.TERMINI_IGRACA.length; i++) {
        let termin = player2.TERMINI_IGRACA.find((s) => player1.TERMINI_IGRACA[i].sat == s.sat && player1.TERMINI_IGRACA[i].dan == s.dan);
        if (termin) {
          termini.push(termin);
        }
      }
      const commonSlots = [...termini];
      for (const slot of commonSlots) {
        if (courts.find((c) => c.dan == slot.dan && c.sat == slot.sat)) {
          // Create a match
          const allocatedCourt = allocateCourt(slot);
          if (allocatedCourt !== null) {
            currentMatch.push({
              player1ID: player1.PLAYER_ID,
              player2ID: player2.PLAYER_ID,
              dayPlayed: allocatedCourt.dan,
              hourPlayed: allocatedCourt.sat,
              courtID: allocatedCourt.teren,
            });

            player1.PREOSTALO_MECEVA--;
            player2.PREOSTALO_MECEVA--;
            player1.ZELI_IGRATI_MECEVA--;
            player2.ZELI_IGRATI_MECEVA--;
            if (countIterations < timeLimit) {
              await generateMatches(players, matches, currentMatch, courts);
              countIterations++;
            } else {
              return matches;
            }
            // Backtrack: restore state
            player1.PREOSTALO_MECEVA++;
            player2.PREOSTALO_MECEVA++;
            player1.ZELI_IGRATI_MECEVA++;
            player2.ZELI_IGRATI_MECEVA++;
            currentMatch.pop();
            courts.push(allocatedCourt);
          }
        }
      }
    }
  }
}

// Example usage:
const matches = [];
const allMatches = [];
const currentMatch = [];
const allTimeSlots = [
  /* DAY-HOUR combinations */
]; // e.g., 1-10 represents Monday 10:00 AM

// Sample player objects (replace with your actual data)
let players = [];

// Initialize courts with available court IDs per time slot
let courts = {};

// Function to allocate a court based on availability
function allocateCourt(timeSlot) {
  //   if (courts[timeSlot].length > 0) {
  let t = courts.find((c) => c.dan == timeSlot.dan && c.sat == timeSlot.sat);
  if (t) {
    return courts.shift(); // Allocate the first available court
  }
  return null; // No available court
}

async function prioritizeMatches(data, prioritizedMatches) {
  bestCombination = null;
  tempBestCombination = 0;
  let totalScore = 0;
  let priorities = data.PRIORITETI.sort(function (a, b) {
    return a.id - b.id;
  });
  if (!prioritizedMatches) {
    return;
  }
    // console.log(prioritizedMatches);
  for (let prioritetiIndex = 0; prioritetiIndex < prioritizedMatches.length; prioritetiIndex++) {
    prioritizedMatches[prioritetiIndex].score = 0;
    for (const priority of priorities) {
      switch (priority.id) {
        case "10":
          totalScore = 0;
          tempBestCombination = 0;
          bestCombination = null;

          let brojIgracaKojimaJeNadjenMec = [...new Set(prioritizedMatches[prioritetiIndex].map((item) => item.player1ID))].length;
          let brojProsledjenihIgraca = data.IGRACI.length;
          let Min1MecScore = 0;
          if (brojIgracaKojimaJeNadjenMec > 0 && brojProsledjenihIgraca > 0) {
            Min1MecScore = brojIgracaKojimaJeNadjenMec / brojProsledjenihIgraca;
          }
          totalScore = Min1MecScore * priority.priority;
          prioritizedMatches[prioritetiIndex].score = totalScore;
          break;
        case "20":
          totalScore = 0;
          tempBestCombination = 0;
          bestCombination = null;

          let brojPronadjenihMeceva = prioritizedMatches[prioritetiIndex].length;
          let klubPonudioTermine = data.TERMINI_KLUBA.length;
          let MaxMecScore = 0;
          if (brojPronadjenihMeceva > 0 && klubPonudioTermine > 0) {
            MaxMecScore = brojPronadjenihMeceva / klubPonudioTermine;
          }
          totalScore = MaxMecScore * priority.priority;
          prioritizedMatches[prioritetiIndex].score += totalScore;
          break;
        case "30":
          totalScore = 0;
          tempBestCombination = 0;
          bestCombination = null;
          let brojPronadjenihJutarnjihMeceva = 0;
          let klubPonudioJutarnjeTermine = 0;
          let JutarnjiTerminiScore = 0;

          for (let j = 0; j < prioritizedMatches[prioritetiIndex].length; j++) {
            if (prioritizedMatches[prioritetiIndex][j].hourPlayed < 12) {
              brojPronadjenihJutarnjihMeceva++;
            }
          }
          for (let i = 0; i < data.TERMINI_KLUBA.length; i++) {
            if (Number(data.TERMINI_KLUBA[i].sat) < 12) {
              klubPonudioJutarnjeTermine++;
            }
          }
          if (brojPronadjenihJutarnjihMeceva > 0 && klubPonudioJutarnjeTermine > 0) {
            JutarnjiTerminiScore = brojPronadjenihJutarnjihMeceva / klubPonudioJutarnjeTermine;
          }

          totalScore = JutarnjiTerminiScore * priority.priority;
          prioritizedMatches[prioritetiIndex].score += totalScore;
          break;
        case "40":
          totalScore = 0;
          tempBestCombination = 0;
          bestCombination = null;

          let ukupanBrojProstalihMecevaZaSveIgraceIzKombinacije = 0;
          let ukupanBrojProstalihMecevaZaSveIgraceIzJsona = 0;
          let BrojPreostalihMecevaScore = 0;

          let ListaSvihIgracaUKombinaciji = [];
          for (let j = 0; j < prioritizedMatches[prioritetiIndex].length; j++) {
            ListaSvihIgracaUKombinaciji.push(prioritizedMatches[prioritetiIndex][j].player1ID);
            ListaSvihIgracaUKombinaciji.push(prioritizedMatches[prioritetiIndex][j].player2ID);
          }
          let unikatnaListaSvihIgracaUKombinaciji = [];
          for (let i = 0; i < ListaSvihIgracaUKombinaciji.length; i++) {
            let count = 0;
            for (let j = 0; j < unikatnaListaSvihIgracaUKombinaciji.length; j++) {
              if (unikatnaListaSvihIgracaUKombinaciji[j] && ListaSvihIgracaUKombinaciji[i] == unikatnaListaSvihIgracaUKombinaciji[j].igrac) {
                count++;
              }
            }
            if (count == 0) {
              unikatnaListaSvihIgracaUKombinaciji.push({ igrac: ListaSvihIgracaUKombinaciji[i], ponavljanje: 1 });
            } else {
              let p = unikatnaListaSvihIgracaUKombinaciji.find((igrac) => igrac.igrac == ListaSvihIgracaUKombinaciji[i]);
              p.ponavljanje += count;
            }
            count = 0;
          }
          for (let i = 0; i < unikatnaListaSvihIgracaUKombinaciji.length; i++) {
            let igrac = data.IGRACI.find((igr) => igr.PLAYER_ID == unikatnaListaSvihIgracaUKombinaciji[i].igrac);
            ukupanBrojProstalihMecevaZaSveIgraceIzKombinacije += Number(igrac.PREOSTALO_MECEVA);
          }
          for (let i = 0; i < data.IGRACI.length; i++) {
            ukupanBrojProstalihMecevaZaSveIgraceIzJsona += Number(data.IGRACI[i].PREOSTALO_MECEVA);
          }
          BrojPreostalihMecevaScore = ukupanBrojProstalihMecevaZaSveIgraceIzKombinacije / ukupanBrojProstalihMecevaZaSveIgraceIzJsona;
          totalScore = BrojPreostalihMecevaScore * priority.priority;
          prioritizedMatches[prioritetiIndex].score += totalScore;

          break;
        case "50":
          totalScore = 0;
          tempBestCombination = 0;
          bestCombination = null;
          for (let i = 0; i < prioritizedMatches.length; i++) {
            let ukupanBrojPrijavljenihTerminaZaSveIgraceIzKombinacije = 0;
            let ukupanBrojPrijavljenihTerminaZaSveIgraceIzJsona = 0;
            let BrojPrijavljenihTerminaScore = 0;

            let ListaSvihIgracaUKombinacijiPrijavljenihTermina = [];
            for (let j = 0; j < prioritizedMatches[i].length; j++) {
              ListaSvihIgracaUKombinacijiPrijavljenihTermina.push(prioritizedMatches[i][j].player1ID);
              ListaSvihIgracaUKombinacijiPrijavljenihTermina.push(prioritizedMatches[i][j].player2ID);
            }
            let unikatnaListaSvihIgracaUKombinacijiPrijavljenihTermina = [];
            for (let i = 0; i < ListaSvihIgracaUKombinacijiPrijavljenihTermina.length; i++) {
              let count = 0;
              for (let j = 0; j < unikatnaListaSvihIgracaUKombinacijiPrijavljenihTermina.length; j++) {
                if (unikatnaListaSvihIgracaUKombinacijiPrijavljenihTermina[j] && ListaSvihIgracaUKombinacijiPrijavljenihTermina[i] == unikatnaListaSvihIgracaUKombinacijiPrijavljenihTermina[j].igrac) {
                  count++;
                }
              }
              if (count == 0) {
                unikatnaListaSvihIgracaUKombinacijiPrijavljenihTermina.push({ igrac: ListaSvihIgracaUKombinacijiPrijavljenihTermina[i], ponavljanje: 1 });
              } else {
                let p = unikatnaListaSvihIgracaUKombinacijiPrijavljenihTermina.find((igrac) => igrac.igrac == ListaSvihIgracaUKombinacijiPrijavljenihTermina[i]);
                p.ponavljanje += count;
              }
              count = 0;
            }
            for (let i = 0; i < unikatnaListaSvihIgracaUKombinacijiPrijavljenihTermina.length; i++) {
              let igrac = data.IGRACI.find((igr) => igr.PLAYER_ID == unikatnaListaSvihIgracaUKombinacijiPrijavljenihTermina[i].igrac);
              ukupanBrojPrijavljenihTerminaZaSveIgraceIzKombinacije += Number(igrac.PREOSTALO_MECEVA);
            }
            for (let i = 0; i < data.IGRACI.length; i++) {
              ukupanBrojPrijavljenihTerminaZaSveIgraceIzJsona += Number(data.IGRACI[i].PREOSTALO_MECEVA);
            }
            if (ukupanBrojPrijavljenihTerminaZaSveIgraceIzKombinacije > 0 && ukupanBrojPrijavljenihTerminaZaSveIgraceIzJsona > 0) {
            }
            BrojPrijavljenihTerminaScore = ukupanBrojPrijavljenihTerminaZaSveIgraceIzKombinacije / ukupanBrojPrijavljenihTerminaZaSveIgraceIzJsona;
            totalScore = BrojPrijavljenihTerminaScore * priority.priority;
            prioritizedMatches[prioritetiIndex].score += totalScore;
          }
          break;
        default:
          break;
      }
    }
  }
  let maxScore = 0;
  maxScoreIndex = 0;
  for (let i = 0; i < prioritizedMatches.length; i++) {
    if (maxScore < prioritizedMatches[i].score) {
      maxScore = prioritizedMatches[i].score;
      maxScoreIndex = i;
    }
  }
  for (let i = 0; i < prioritizedMatches.length; i++) {
    let check = false;
    for (let j = 0; j < prioritizedMatches[i].length; j++) {
      if (prioritizedMatches[i].length > 2 && prioritizedMatches[i][j].hourPlayed > 11) {
        check = true;
      }
    }
  }
  return await Array.from(prioritizedMatches[maxScoreIndex]); // Pretvaramo Set nazad u niz pre vraćanja rezultata
}

async function setData(data) {
  if (!data) {
    return "data is null";
  } else if (!data || typeof data !== "object") {
    return "Invalid JSON data format: Data is not a valid JSON object.";
  } else if (!data.IGRACI) {
    return "IGRACI in data is null";
  } else if (!data.TERMINI_KLUBA) {
    return "TERMINI_KLUBA in data is null";
  } else if (!data.PRIORITETI) {
    return "PRIORITETI in data is null";
  }
  if (data.TIMEOUT && parseInt(data.TIMEOUT) > 1) {
    timeLimit = parseInt(data.TIMEOUT) * 1000;
  } else {
    timeLimit = 1000;
  }

  //find max num of combinations
  let igraci2 = JSON.parse(JSON.stringify(data.IGRACI));
  let termini2 = JSON.parse(JSON.stringify(data.TERMINI_KLUBA));

  const possibleMatches = findAllPossibleMatches(igraci2, termini2);
  let r = maximizeMatches(possibleMatches, igraci2, termini2);
  maxCombination = await r.usedCourts.length;
  for (let i = 0; i < data.IGRACI.length; i++) {
    data.IGRACI[i].ZELI_IGRATI_MECEVA = parseInt(data.IGRACI[i].ZELI_IGRATI_MECEVA);
    data.IGRACI[i].PREOSTALO_MECEVA = parseInt(data.IGRACI[i].PREOSTALO_MECEVA);
    for (let j = 0; j < data.IGRACI[i].TERMINI_IGRACA.length; j++) {
      data.IGRACI[i].TERMINI_IGRACA[j].sat = parseInt(data.IGRACI[i].TERMINI_IGRACA[j].sat);
      data.IGRACI[i].TERMINI_IGRACA[j].dan = parseInt(data.IGRACI[i].TERMINI_IGRACA[j].dan);
    }
  }
  for (let i = 0; i < data.TERMINI_KLUBA.length; i++) {
    data.TERMINI_KLUBA[i].dan = parseInt(data.TERMINI_KLUBA[i].dan);
    data.TERMINI_KLUBA[i].sat = parseInt(data.TERMINI_KLUBA[i].sat);
  }
  for (let i = 0; i < data.PRIORITETI.length; i++) {
    data.PRIORITETI[i].priority = parseInt(data.PRIORITETI[i].priority);
    data.PRIORITETI[i].score = 0;
    data.PRIORITETI[i].bestCombination = null;
  }

  players = data.IGRACI;
  courts = data.TERMINI_KLUBA;
  // console.log("data", data);
  let result;
  for (let i = 0; i < data.IGRACI.length; i++) {
    countNumberOfPlayers++;
    result = await generateMatches(players, matches, currentMatch, courts);
  }
  if (!result) {
    result = await matches;
  }
//   console.log("result", result);
  let bestCombination = await prioritizeMatches(data, result);
//   console.log("bestCombination", bestCombination);
  if (!bestCombination) {
    bestCombination = "no data";
  }
  return bestCombination;
}

const dev = 1;

if (dev === 0) {
  fetch("./datagenerisani6.json")
    .then((response) => response.json())
    .then((json) => setData(json));
}

if (dev === 1) {
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

    let result = await setData(json);
    let senddata = await JSON.stringify(result);
    return await senddata.toString();
  };
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
// Funkcija za maksimizaciju broja mečeva
function maximizeMatches(matches, igraci2, termini2) {
  // svaki igrac igra sa drugim protivnikom neki drugi dan u slobodnom terminu
  const usedCourts = [];
  const TERMINI_KLUBA = Array.from(termini2);
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
        const player1 = igraci2.find((igrac) => igrac.PLAYER_ID === matches[j].player1ID);
        const player2 = igraci2.find((igrac) => igrac.PLAYER_ID === matches[j].player2ID);
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
