"use strict";
// Generiert mit npm run bundle; Quelldaten: levels/*.json.
(globalThis.Sturzstein ??= {}).packs = [
  {
    "formatVersion": 1,
    "id": "sturzstein-einstieg",
    "title": "Die erste Tiefe",
    "author": "Sturzstein-Projekt",
    "revision": 1,
    "source": "Eigene, für Sturzstein entworfene Höhle.",
    "license": "Eigener Projektinhalt; keine Fremdlevel oder Originalassets.",
    "levels": [
      {
        "id": "erste-schritte",
        "revision": 1,
        "ruleVersion": 1,
        "name": "Ein Funkeln im Dunkeln",
        "description": "Grabe zum Funkeln, sammle drei Edelsteine und erreiche den Ausgang. Unter Felsen ist Vorsicht geboten.",
        "difficulty": 1,
        "width": 20,
        "height": 12,
        "timeLimit": 120,
        "quota": 3,
        "seed": 137,
        "map": [
          "####################",
          "#@......#..........#",
          "#...*...#..O.......#",
          "#.......#..........#",
          "#..O....#.....*....#",
          "#.......#..........#",
          "#.......+..........#",
          "#..................#",
          "#..*.....O.........#",
          "#................X.#",
          "#..................#",
          "####################"
        ],
        "parameters": {
          "amoebaGrowthTicks": 10,
          "amoebaMaxCells": 200,
          "magicWallTicks": 200
        }
      }
    ]
  }
];
