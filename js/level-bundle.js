"use strict";
// Generiert mit npm run bundle; Quelldaten: levels/*.json.
(globalThis.Sturzstein ??= {}).packs = [
  {
    "formatVersion": 1,
    "id": "sturzstein-einstieg",
    "title": "Die erste Tiefe",
    "author": "Sturzstein-Projekt",
    "revision": 3,
    "source": "Eigene, für Sturzstein entworfene Höhlen.",
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
      },
      {
        "id": "glutkaefer-tor",
        "revision": 1,
        "ruleVersion": 1,
        "name": "Das Glutkäfer-Tor",
        "description": "Glutkäfer folgen der linken Wand. Sammle den Edelstein. Grabe von links die Erde direkt unter dem Fels mit Aktion + rechts. Bleibe dort sicher stehen und beobachte den Steinschlag. Bei einem Treffer öffnet die 3×3-Explosion die Mauern. Erst danach durchgehen; sonst neu versuchen.",
        "difficulty": 2,
        "width": 15,
        "height": 9,
        "timeLimit": 90,
        "quota": 1,
        "seed": 241,
        "map": [
          "###############",
          "#@*...#O##r  ##",
          "#.......##   ##",
          "#.....+ +.....#",
          "#..... l ...X.#",
          "#..... + .....#",
          "#.....   .....#",
          "#.....###.....#",
          "###############"
        ],
        "parameters": {
          "amoebaGrowthTicks": 10,
          "amoebaMaxCells": 200,
          "magicWallTicks": 200
        }
      },
      {
        "id": "kristallkette",
        "revision": 1,
        "ruleVersion": 1,
        "name": "Die Kristallkette",
        "description": "Kristallfalter folgen der rechten Wand. Grabe von links die Erde unter dem Fels mit Aktion + rechts. Warte dort sicher auf einen Treffer und die Explosionskette. Sammle danach am oberen Rand mindestens drei neue Edelsteine und gehe zum Ausgang. Ein verfehlter Steinschlag lässt sich zurückspulen.",
        "difficulty": 2,
        "width": 15,
        "height": 9,
        "timeLimit": 90,
        "quota": 3,
        "seed": 389,
        "map": [
          "###############",
          "#@....#O##R  ##",
          "#.......##   ##",
          "#.....+ +.....#",
          "#..... R ...X.#",
          "#..... +D.....#",
          "#.....   .....#",
          "#.....###.....#",
          "###############"
        ],
        "parameters": {
          "amoebaGrowthTicks": 10,
          "amoebaMaxCells": 200,
          "magicWallTicks": 200
        }
      },
      {
        "id": "gruene-kammer",
        "revision": 1,
        "ruleVersion": 1,
        "name": "Die grüne Kammer",
        "description": "Stell dich im Startgang vier Schritte nach rechts zwischen die beiden Mauersteine. Dein Körper verschließt den Zugang zur grünen Amöbe. Warte, bis die Kammer voll ist und die Masse zu Edelsteinen wird. Sammle drei davon und nimm den unteren Gang zum Ausgang. Lässt du den Zugang offen, wuchert sie hinaus und wird zu Fels.",
        "difficulty": 2,
        "width": 16,
        "height": 9,
        "timeLimit": 90,
        "quota": 3,
        "seed": 537,
        "map": [
          "################",
          "#.....+........#",
          "#.....+++++#...#",
          "#.....+# . #...#",
          "#.@.... . A#...#",
          "#.....+####+...#",
          "#.....+........#",
          "#.............X#",
          "################"
        ],
        "parameters": {
          "amoebaGrowthTicks": 10,
          "amoebaMaxCells": 7,
          "magicWallTicks": 200
        }
      },
      {
        "id": "drei-schaechte",
        "revision": 1,
        "ruleVersion": 1,
        "name": "Die drei Schächte",
        "description": "Gehe im oberen Gang unter den drei Steinen nach rechts. Im ersten Schacht wird der Fels zum Edelstein. Solange die Wand leuchtet, wird im zweiten ein Edelstein zum Fels. Der dritte Auslass ist zugemauert und blinkt beim Treffer rot. Steige ganz rechts hinab, sammle den Edelstein unter dem ersten Schacht und gehe unten links zum Ausgang.",
        "difficulty": 2,
        "width": 18,
        "height": 9,
        "timeLimit": 90,
        "quota": 1,
        "seed": 811,
        "map": [
          "##################",
          "#++++O+++*+++O+++#",
          "#@...............#",
          "#++++ +++ +++ ++.#",
          "#++++M+++M+++M++.#",
          "#.... ... ...+...#",
          "#.... ... ...+...#",
          "#.X..............#",
          "##################"
        ],
        "parameters": {
          "amoebaGrowthTicks": 10,
          "amoebaMaxCells": 200,
          "magicWallTicks": 35
        }
      }
    ]
  }
];
