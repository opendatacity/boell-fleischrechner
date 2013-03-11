# Fleischrechner

## Methodik

### Datenlage

Daten wurden aus verschiedenen zugänglichen Quellen zusammengetragen, diese wurden in der Datei `data/stat.tsv` zusammengestellt. Gesammelt wurden Gewichtsangaben zu Verbrauch/Verzehr pro Person für verschiedene Tierarten (Rind, Kalb, Schwein, Schaf/Ziege, Pferd, Innereien, Geflügel, Sonstige, Fett, Fisch) pro Jahr. Die Daten sind bezogen auf Jahr, Wert und Tierart unvollständig, weswegen fehlende Werte interpoliert werden.

### Vorbereitung

In einem ersten Schritt, werden die vorliegenden Daten normalisiert. Rind und Kalb werden zu Rind, sowie Pferd, Innereien und Sonstige zu Sonstige zusammengefasst. Fett und Fisch werden nicht weiter verarbeitet. 

Folgend werden für Werte, die doppelt aus unterschiedlichen Quellen vorliegen (z.B. 2010 Verbrauch Rind), die Mittelwerte errechnet. Anschließend werden die Mittelwerte zu einer Gesamtmenge addiert.

Im letzten Vorbereitungsschritt werden für jene Jahre, für die sowohl Verzehr- als auch Verbrauchsangaben vorliegen, das Verhältnis dieser Werte bestimmt. Übersteigt die Verzehrmenge die Verbrauchsmenge nach Datenlage, wird ein Verhältnis von 1:1 angenommen.

### Interpolation

Für Jahre, zu denen nur Verzehr- oder Verbrauchswert vorliegt, wird das Verhältnis zwischen Verzehr und Verbrauch aus den nächstliegenden Jahren mit beiden Werten *linear interpoliert*. Da vor 1935 für kein Jahr beide Werte vorliegen, wird für das Jahr 1900 ein Verhältnis von `1:1` angenommen. 

Anhand des Interpolierten Verhältnisses wird für die Jahre, zu denen nur ein Wert vorliegt, die fehlenden Werte mittels dieses Verhältnisses aus dem vorhandenen Wert abgeleitet.

Für die Zeiträume 1914-1924 sowie 1939-1946 liegen keinerlei Daten vor. Für Jahre aus diesen Zeiträumen werden die Verzehrmengen aus den Verzehrmengen der umliegenden Jahre *linear interpoliert*. Weltkriegsbedingte Verbrauchs- und Verzehreinbrüche, wie sie in *Teuteberg (1972)* skizziert werden, finden keine Beachtung.

Die durch Interpolation vervollständigten Datensätze werden in der Datei `data/consumption.json` gespeichert.

Für Jahre, zu denen noch keine Werte vorliegen (2012, 2013), werden die Werte für das letzte bekannte Jahr (2011) angenommen.

## Berechnung

Für die Berechnung der verzehrten Tiermengen werden zwei Werte Bestimmt: Geburtsjahr/monat sowie Geschlecht. Für das jeweilige Lebensjahr die statistisch durchschnittliche Verzehrmenge mit einem dem Alter entsprechenden Faktor multipliziert, um altersbedingten Minder- und Mehrkonsum abzubilden. Dabei werden folgende Faktoren Angenommen: 

* 0-1: `13%`
* 2-3: `30%` 
* 4-6: `40%`
* 7-9: `50%`
* 10-14: `80%`
* 15-18: `100%`
* 19-24: `120%`
* 25-50: `110%`
* 51-64: `100%`
* 65-80: `80%`
* 80-113: `70%`

Ebenfalls wird eine geschlechterspezifische Abweichung abgebildet, als Faktoren werden angewandt bei männlicher Verortung `140%`, bei weiblicher Verortung `60%`;

Durch Addition der so bestimmten Werte aus den Jahren des Zeitraumes seit der Geburt wird die Gesamtmenge an verzehrtem Fleisch addiert, wobei für das Geburtsjahr und das laufende Jahr die Werte anteilig berechnet werden. 

Da die Visualisierung getrennt nach Vogelarten statt finden soll, in den Daten jedoch nur die Sammelkategorie "Geflügel" vorliegt, werden die Vogelsorten nach folgendem Verhältnis angenommen: 

* Gans `4%`
* Ente `6%`
* Huhn `57%`
* Pute `33%`

Die auf diese Art ermittelten Verzehrmengen werden mittels tierartspezifischer Faktoren in Tiere umgerechnet. Diese Faktoren liegen uns derzeit nicht vor, die zur Bildung der Faktoren notwendigen Daten bedürfen weitergehender Recherche.

Zu Testzwecken werden folgende – **geschätzten!** – Werte angewandt: 

* Rind `245 kg/Tier`
* Schwein `52 kg/Tier`
* Schaf `12kg/Tier`
* Gans `1,61 kg/Tier`
* Ente `0,79 kg/Tier`
* Huhn `0,2918 kg/Tier`
* Pute `3,47 kg/Tier`
