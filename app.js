/* Schaltpunkt - Oberflaeche. Rechnen macht logic.js (SP). */
(function () {
  'use strict';

  var S = window.SP;
  var APP_VERSION = '2.0.0';

  var state = null;
  var nav = { tab: 'uebersicht', stack: [], sub: { ausbildung: 'fahren', kosten: 'uebersicht' } };
  var sheetCtx = null;
  var undoDaten = null;
  var undoTimer = null;
  var installEreignis = null;

  /* ================= Speicher ================= */

  function laden() {
    try {
      var roh = localStorage.getItem(S.STORAGE_KEY);
      return roh ? S.migrate(JSON.parse(roh)) : S.emptyState();
    } catch (e) {
      console.warn('Daten unlesbar:', e);
      return S.emptyState();
    }
  }

  function speichern() {
    try { localStorage.setItem(S.STORAGE_KEY, JSON.stringify(state)); return true; }
    catch (e) { hinweis('Speichern fehlgeschlagen'); return false; }
  }

  /* ================= Bausteine ================= */

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function heute() { return S.todayISO(); }

  var ICON = {
    chev: '<svg class="chev" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
    haken: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
    kreuz: '<svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17"/></svg>',
    punkt: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.5"/></svg>',
    uhr: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    stern: '<svg viewBox="0 0 24 24"><path d="M12 4.5l2.3 4.9 5.2.7-3.8 3.7.9 5.2-4.6-2.5-4.6 2.5.9-5.2L4.5 10l5.2-.7z"/></svg>',
    haken2: '<svg viewBox="0 0 24 24"><path d="M4.5 12.5l5 5 10-11"/></svg>',
    stift: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/></svg>',
    farbe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17"/></svg>',
    zahn: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M19.5 12a7.5 7.5 0 0 0-.2-1.7l2-1.5-2-3.4-2.3 1a7.5 7.5 0 0 0-2.9-1.7L13.7 2h-3.9l-.4 2.7a7.5 7.5 0 0 0-2.9 1.7l-2.3-1-2 3.4 2 1.5a7.5 7.5 0 0 0 0 3.4l-2 1.5 2 3.4 2.3-1a7.5 7.5 0 0 0 2.9 1.7l.4 2.7h3.9l.4-2.7a7.5 7.5 0 0 0 2.9-1.7l2.3 1 2-3.4-2-1.5c.13-.55.2-1.12.2-1.7Z"/></svg>',
    liste: '<svg viewBox="0 0 24 24"><path d="M8 7h12M8 12h12M8 17h8M4 7h.01M4 12h.01M4 17h.01"/></svg>',
    euro: '<svg viewBox="0 0 24 24"><path d="M16 7.5a5 5 0 1 0 0 9M5.5 11h7M5.5 14h6"/></svg>',
    pfeilRunter: '<svg viewBox="0 0 24 24"><path d="M12 5v13M6.5 12.5L12 18l5.5-5.5"/></svg>',
    handy: '<svg viewBox="0 0 24 24"><rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/></svg>',
    buch: '<svg viewBox="0 0 24 24"><path d="M4 5.5h6a2 2 0 0 1 2 2V19a2 2 0 0 0-2-2H4zM20 5.5h-6a2 2 0 0 0-2 2V19a2 2 0 0 1 2-2h6z"/></svg>',
    auto: '<svg viewBox="0 0 24 24"><path d="M5 16.5h14M7 16.5v-6l1.4-4h7.2l1.4 4v6M8 19v-2.5m8 2.5v-2.5"/></svg>',
    flagge: '<svg viewBox="0 0 24 24"><path d="M6 21V4M6 4h12l-2.5 4L18 12H6"/></svg>'
  };

  var SAEULENFARBE = { 1: 'var(--akzent)', 2: 'var(--terra)', 3: 'var(--olive)', 4: 'var(--warmgrau)' };

  var BILD_STRASSE = '<svg class="hero__b" viewBox="0 0 96 74" aria-hidden="true">' +
    '<defs><linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="var(--akzent)" stop-opacity=".35"/>' +
    '<stop offset="1" stop-color="var(--akzent)" stop-opacity="0"/></linearGradient></defs>' +
    '<circle cx="70" cy="20" r="11" fill="var(--akzent)" stroke="none"/>' +
    '<path d="M0 52c14-9 26-9 40-2s28 8 56-4v28H0z" fill="url(#hg)" stroke="none"/>' +
    '<path d="M40 74l6-34h4l6 34" fill="var(--fg)" opacity=".14" stroke="none"/>' +
    '<path d="M48 44v4m0 7v6m0 9v10" stroke="var(--flaeche)" stroke-width="3"/>' +
    '</svg>';

  function gruppe(titel, inhalt, fuss, aktion) {
    return '<section class="gruppe">' +
      (titel ? '<div class="gruppe__kopf"><h2 class="gruppe__titel">' + esc(titel) + '</h2>' +
        (aktion ? '<button type="button" class="gruppe__aktion" data-go="' + aktion.ziel + '">' + esc(aktion.label) + '</button>' : '') +
        '</div>' : '') +
      '<div class="karte">' + inhalt + '</div>' +
      (fuss ? '<p class="gruppe__fuss">' + fuss + '</p>' : '') +
      '</section>';
  }

  function bloss(inhalt) { return '<section class="gruppe">' + inhalt + '</section>'; }

  /* o = { t, u, w, wUnter, ziel, klasse, marke, balken:{ist,soll}, roh } */
  function zeile(o) {
    var innen =
      (o.icon ? '<span class="zeile__i">' + o.icon + '</span>' : '') +
      '<span class="zeile__mitte"><span class="zeile__t">' + (o.t || '') + '</span>' +
      (o.u ? '<span class="zeile__u">' + o.u + '</span>' : '') +
      (o.balken ? '<span class="balken"><span class="balken__f ' +
        (S.pct(o.balken.ist, o.balken.soll) >= 100 ? 'voll' : '') +
        '" style="width:' + S.pct(o.balken.ist, o.balken.soll) + '%"></span></span>' : '') +
      '</span>' +
      (o.marke ? '<span class="marke ' + (o.markeKlasse || '') + '">' + esc(o.marke) + '</span>' : '') +
      (o.w !== undefined && o.w !== '' ? '<span class="zeile__w">' +
        (o.wUnter ? '<b>' + o.w + '</b><span>' + o.wUnter + '</span>' : o.w) + '</span>' : '') +
      (o.ziel ? ICON.chev : '');
    var klasse = 'zeile ' + (o.klasse || '');
    return o.ziel
      ? '<button type="button" class="' + klasse + '" data-go="' + o.ziel + '">' + innen + '</button>'
      : '<div class="' + klasse + '">' + innen + '</div>';
  }

  function leer(text) { return '<p class="leerzeile">' + esc(text) + '</p>'; }

  function seg(name, wert, paare) {
    return '<div class="seg" data-segname="' + name + '">' + paare.map(function (p) {
      return '<button type="button" class="seg__b ' + (p[0] === wert ? 'an' : '') +
        '" data-segwert="' + p[0] + '">' + esc(p[1]) + '</button>';
    }).join('') + '</div>';
  }

  function ring(prozent, groesse, strich, mitText) {
    groesse = groesse || 120; strich = strich || 9;
    var r = groesse / 2 - strich / 2 - 2, u = 2 * Math.PI * r, m = groesse / 2;
    return '<svg class="ring" width="' + groesse + '" height="' + groesse + '" viewBox="0 0 ' + groesse + ' ' + groesse + '">' +
      '<circle class="ring__spur" cx="' + m + '" cy="' + m + '" r="' + r + '" fill="none" stroke-width="' + strich + '"/>' +
      '<circle class="ring__wert" cx="' + m + '" cy="' + m + '" r="' + r + '" fill="none" stroke-width="' + strich + '" ' +
      'stroke-dasharray="' + u.toFixed(1) + '" stroke-dashoffset="' + (u * (1 - prozent / 100)).toFixed(1) +
      '" transform="rotate(-90 ' + m + ' ' + m + ')"/>' +
      (mitText === false ? '' : '<text class="ringtext" x="' + m + '" y="' + m + '" text-anchor="middle" dominant-baseline="central">' + prozent + '%</text>') +
      '</svg>';
  }

  function saeule(nr, name, unter, ist, soll) {
    var p = S.pct(ist, soll);
    return '<div class="saeule"><div class="saeule__s">' +
      '<div class="saeule__f" style="height:' + Math.max(p, 20) + '%;background:' + SAEULENFARBE[nr] +
      ';color:' + (nr === 1 ? 'var(--auf-akzent)' : '#fff') + '">' + p + '%</div></div>' +
      '<span class="saeule__n">' + esc(name) + '</span>' +
      '<span class="saeule__u">' + esc(unter) + '</span></div>';
  }

  /* ================= Darstellung anwenden ================= */

  function ui() { return state.settings.ui; }

  function anwendenUI() {
    var w = document.documentElement;
    var design = ui().design;
    if (design === 'system') {
      design = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dunkel' : 'hell';
    }
    w.setAttribute('data-design', design);
    w.setAttribute('data-akzent', ui().akzent);
    w.setAttribute('data-schrift', ui().schrift);
    w.setAttribute('data-kompakt', ui().kompakt ? '1' : '0');
    w.setAttribute('data-animationen', ui().animationen ? '1' : '0');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', design === 'dunkel' ? '#131211' : '#F1EFEC');
  }

  /* ================= Ansichten ================= */

  var TITEL_TAB = { uebersicht: 'Übersicht', ausbildung: 'Ausbildung', kosten: 'Kosten', mehr: 'Mehr' };

  function render() {
    anwendenUI();
    var seite = nav.stack.length ? nav.stack[nav.stack.length - 1] : null;

    ['uebersicht', 'ausbildung', 'kosten', 'mehr', 'seite'].forEach(function (v) {
      $('v-' + v).hidden = seite ? v !== 'seite' : v !== nav.tab;
    });
    Array.prototype.forEach.call(document.querySelectorAll('.reiter[data-tab]'), function (b) {
      b.classList.toggle('an', !seite && b.dataset.tab === nav.tab);
    });

    $('btnZurueck').hidden = !seite;
    $('btnKopfAktion').hidden = true;
    $('kopfTitel').textContent = seite ? SEITEN[seite.id].titel : TITEL_TAB[nav.tab];

    if (seite) {
      $('v-seite').innerHTML = SEITEN[seite.id].html();
      if (SEITEN[seite.id].danach) SEITEN[seite.id].danach();
    } else if (nav.tab === 'uebersicht') $('v-uebersicht').innerHTML = ansichtUebersicht();
    else if (nav.tab === 'ausbildung') $('v-ausbildung').innerHTML = ansichtAusbildung();
    else if (nav.tab === 'kosten') $('v-kosten').innerHTML = ansichtKosten();
    else if (nav.tab === 'mehr') $('v-mehr').innerHTML = ansichtMehr();
  }

  function zuTab(tab) { nav.stack = []; nav.tab = tab; render(); window.scrollTo(0, 0); }
  function zuSeite(id) { nav.stack.push({ id: id }); render(); window.scrollTo(0, 0); }
  function zurueck() { nav.stack.pop(); render(); window.scrollTo(0, 0); }

  /* ---------- Übersicht ---------- */

  function ansichtUebersicht() {
    var st = S.stationen(state);
    var reife = S.pruefungsreife(state);
    var k = S.kostenStats(state);
    var f = S.fahrstundenStats(state);
    var th = S.theorieStats(state);
    var z = state.settings.ziele;
    var w = S.woche(state);
    var out = '';

    /* Begrüßung */
    var name = (state.settings.fahrschule || '').replace(/^Fahrschule\s*/i, '');
    out += '<div class="hallo"><div class="hallo__t">' +
      '<h2>' + (state.settings.name ? 'Hallo, ' + esc(state.settings.name) : 'Hallo!') + '</h2><p>Klasse ' + esc(state.settings.klasse) + (name ? ' · ' + esc(name) : '') + '</p></div>' +
      '<button type="button" class="hallo__ring" data-go="seite:reife" aria-label="Prüfungsreife">' +
      ring(st.gesamt, 54, 5, false) + '<b>' + st.gesamt + '%</b></button></div>';

    /* Wochenstreifen */
    out += '<div class="woche">' + S.wochentage(state).map(function (t) {
      var aktiv = t.ue > 0 || t.theorie > 0 || t.pruefung > 0;
      return '<div class="woche__t ' + (t.heute ? 'heute' : t.zukunft ? 'zukunft' : '') + '">' +
        '<small>' + t.tag + '</small>' +
        '<span class="woche__p">' + t.nummer + (aktiv ? '<i></i>' : '') + '</span></div>';
    }).join('') + '</div>';

    /* Hero: nächster Termin oder Wochenstand */
    var termin = S.termine(state)[0];
    if (termin) {
      out += bloss('<button type="button" class="hero" data-go="edit:' +
        (termin.typ === 'pruefung' ? 'pruefung' : termin.typ === 'theorie' ? 'theorie' : 'fahrstunde') + ':' + termin.id + '">' +
        '<span class="hero__t"><span class="hero__k">Als Nächstes</span>' +
        '<span class="hero__h">' + esc(termin.label) + '</span>' +
        '<span class="hero__u">' + S.datum(termin.datum, true) + '</span>' +
        '<span class="hero__zaehler"><b>' + (termin.tage === 0 ? 'heute' : termin.tage) + '</b>' +
        (termin.tage === 0 ? '' : '<span>' + (termin.tage === 1 ? 'Tag' : 'Tage') + '</span>') + '</span>' +
        '</span>' + BILD_STRASSE + '</button>');
    } else {
      out += bloss('<button type="button" class="hero" data-go="neu:fahrstunde">' +
        '<span class="hero__t"><span class="hero__k">Kein Termin</span>' +
        '<span class="hero__h">Nächste Fahrstunde eintragen</span>' +
        '<span class="hero__u">Termine in der Zukunft zählen erst, wenn der Tag da ist.</span></span>' +
        BILD_STRASSE + '</button>');
    }

    /* Schnell eintragen */
    out += '<section class="gruppe"><div class="gruppe__kopf"><h2 class="gruppe__titel">Schnell eintragen</h2></div>' +
      '<div class="schnell">' +
      schnellKarte('ton-4', 'Fahrstunde', 'Übung, Sonderfahrt oder Testfahrt', S.ue(f.gesamtUE) + ' UE', 'neu:fahrstunde') +
      schnellKarte('ton-2', 'Theoriestunde', 'Grundstoff oder Zusatzstoff', th.ist + '/' + th.soll, 'neu:theorie') +
      schnellKarte('ton-3', 'Zahlung', 'Rate an die Fahrschule', S.eur(k.bezahlt), 'neu:zahlung') +
      schnellKarte('ton-1', 'Einzelposten', 'Sehtest, Erste Hilfe, Gebühren', S.eur(k.posten), 'neu:kosten') +
      '</div></section>';

    /* Pflichtfahrten als Säulen */
    var saeulen = saeule(1, 'Überland', S.ue(Math.min(f.ueberland, z.ueberland)) + '/' + z.ueberland, f.ueberland, z.ueberland) +
      saeule(2, 'Autobahn', S.ue(Math.min(f.autobahn, z.autobahn)) + '/' + z.autobahn, f.autobahn, z.autobahn) +
      saeule(3, 'Nacht', S.ue(Math.min(f.nacht, z.nacht)) + '/' + z.nacht, f.nacht, z.nacht);
    if (state.settings.klasse === 'B197') {
      saeulen += saeule(4, 'Schalten', S.ue(Math.min(f.schaltUE, z.schaltUE)) + '/' + z.schaltUE, f.schaltUE, z.schaltUE);
    }
    out += gruppe('Pflichtfahrten',
      '<div class="saeulen">' + saeulen + '</div>' +
      zeile({
        t: reife.offen.length ? 'Was noch fehlt' : 'Alle Pflichtteile erfüllt',
        u: reife.offen.length ? reife.offen.length + ' von ' + reife.items.length + ' Punkten offen' : 'Du kannst zur Prüfung',
        ziel: 'seite:reife', klasse: 'zeile--akzent'
      }),
      '', { label: 'Alle', ziel: 'sub:ausbildung:fahren' });

    /* Woche */
    out += gruppe('Diese Woche',
      zeile({
        t: S.ue(w.ue) + ' UE gefahren',
        u: w.ziel > 0 ? 'Ziel: ' + S.ue(w.ziel) + ' UE pro Woche' : S.datum(w.von).slice(0, 5) + ' bis ' + S.datum(w.bis).slice(0, 5),
        w: w.ziel > 0 ? w.prozent + '%' : w.anzahl + 'x',
        balken: w.ziel > 0 ? { ist: w.ue, soll: w.ziel } : null
      }) +
      zeile({ t: 'Theoriestunden', w: th.besuche + ' besucht', icon: ICON.buch, ziel: 'sub:ausbildung:theorie' }));

    /* Fristen */
    var fristen = S.fristen(state);
    if (fristen.length) {
      out += gruppe('Fristen', fristen.map(function (fr) {
        return zeile({
          t: esc(fr.titel),
          u: fr.tage < 0 ? 'seit ' + Math.abs(fr.tage) + ' Tagen abgelaufen' : 'noch ' + fr.tage + ' Tage',
          marke: fr.level === 'rot' ? 'abgelaufen' : fr.level === 'gelb' ? 'bald' : 'im Plan',
          markeKlasse: fr.level === 'rot' ? 'marke--rot' : fr.level === 'gelb' ? '' : 'marke--gruen'
        });
      }).join(''), esc(fristen[0].text));
    }

    /* Kosten */
    out += gruppe('Kosten',
      '<div class="gross"><div class="gross__z num">' + S.eur(k.gesamt) + '</div>' +
      '<p class="gross__u">bisher angefallen</p></div>' +
      '<div class="dreier">' +
      '<div><b class="num">' + S.eur(k.bezahlt) + '</b><span>bezahlt</span></div>' +
      '<div><b class="num">' + S.eur(Math.abs(k.offen)) + '</b><span>' + (k.offen >= 0 ? 'offen' : 'Guthaben') + '</span></div>' +
      '<div><b class="num">' + S.pct(k.bezahlt, k.gesamt) + '%</b><span>beglichen</span></div>' +
      '</div>', '', { label: 'Details', ziel: 'tab:kosten' });

    return out;
  }

  function schnellKarte(ton, titel, text, wert, ziel) {
    return '<button type="button" class="schnell__k ' + ton + '" data-go="' + ziel + '">' +
      '<span><h3>' + esc(titel) + '</h3><p>' + esc(text) + '</p></span>' +
      '<span class="schnell__p">' + esc(wert) + '</span></button>';
  }

  /* ---------- Ausbildung ---------- */

  function ansichtAusbildung() {
    var unter = nav.sub.ausbildung;
    var out = seg('ausbildung', unter, [['fahren', 'Fahrstunden'], ['theorie', 'Theorie'], ['pruefungen', 'Prüfungen']]);
    if (unter === 'fahren') out += teilFahren();
    else if (unter === 'theorie') out += teilTheorie();
    else out += teilPruefungen();
    return out;
  }

  function teilFahren() {
    var f = S.fahrstundenStats(state);
    var z = state.settings.ziele;
    var out = '';

    var reihen =
      zeile({ t: 'Überland', w: S.ue(Math.min(f.ueberland, z.ueberland)) + '/' + z.ueberland, balken: { ist: f.ueberland, soll: z.ueberland } }) +
      zeile({ t: 'Autobahn', w: S.ue(Math.min(f.autobahn, z.autobahn)) + '/' + z.autobahn, balken: { ist: f.autobahn, soll: z.autobahn } }) +
      zeile({ t: 'Nacht', w: S.ue(Math.min(f.nacht, z.nacht)) + '/' + z.nacht, balken: { ist: f.nacht, soll: z.nacht } });
    if (state.settings.klasse === 'B197') {
      reihen += zeile({ t: 'Schaltstunden', w: S.ue(Math.min(f.schaltUE, z.schaltUE)) + '/' + z.schaltUE, balken: { ist: f.schaltUE, soll: z.schaltUE } }) +
        zeile({
          t: 'Testfahrt', u: f.testfahrt ? S.num(f.testfahrt.minuten) + ' Minuten am ' + S.datum(f.testfahrt.datum) : 'mindestens ' + z.testfahrtMin + ' Minuten',
          marke: f.testfahrtOk ? 'erledigt' : 'offen', markeKlasse: f.testfahrtOk ? 'marke--gruen' : ''
        });
    }
    out += gruppe('Pflichtfahrten', reihen,
      state.settings.klasse === 'B197' ? 'Die Testfahrt zählt nicht auf die ' + z.schaltUE + ' Schaltstunden, sie kommt danach.' : '');

    var tp = S.tempo(state);
    if (tp.proWoche !== null) {
      var max = Math.max.apply(null, tp.wochen.map(function (x) { return x.ue; }).concat([1]));
      out += gruppe('Tempo',
        '<div class="wochen">' + tp.wochen.map(function (x) {
          return '<div class="wochen__s"><div class="wochen__b ' + (x.ue === 0 ? 'leer' : '') +
            '" style="height:' + Math.max(Math.round(x.ue / max * 100), 4) + '%"></div>' +
            '<small>' + S.datum(x.von).slice(0, 5) + '</small></div>';
        }).join('') + '</div>' +
        zeile({ t: 'Schnitt pro Woche', w: S.ue(tp.proWoche) + ' UE' }) +
        zeile({
          t: 'Pflichtstunden voraussichtlich fertig',
          w: tp.restUE > 0 && tp.prognose ? S.datum(tp.prognose) : 'erledigt'
        }) +
        (f.schnitt ? zeile({ t: 'Deine Bewertung', w: String(f.schnitt).replace('.', ',') + ' von 5' }) : ''));
    }

    var liste = S.sortiert(state.fahrstunden);
    out += gruppe('Einträge' + (liste.length ? ' (' + liste.length + ')' : ''),
      liste.length ? liste.map(function (e) {
        var geplant = !S.erledigt(e);
        var teile = [S.ue(e.ue) + ' UE'];
        if (state.settings.klasse === 'B197') teile.push(e.getriebe === 'schalt' ? 'Schaltwagen' : 'Automatik');
        if (e.art === 'testfahrt') teile.push(S.num(e.minuten) + ' min');
        if (e.fahrlehrer) teile.push(esc(e.fahrlehrer));
        return zeile({
          t: esc(S.ARTEN[e.art].label), u: teile.join(' · '),
          marke: geplant ? 'geplant' : '', markeKlasse: 'marke--akzent',
          w: e.kosten > 0 ? S.eur(e.kosten) : '–', wUnter: S.datum(e.datum),
          ziel: 'edit:fahrstunde:' + e.id
        });
      }).join('') : leer('Noch keine Fahrstunde. Über das Plus unten legst du die erste an.'));

    return out;
  }

  function teilTheorie() {
    var th = S.theorieStats(state);
    var out = '';

    function raster(block, soll, map) {
      var max = Math.max(soll, Math.max.apply(null, Object.keys(map).map(Number).concat([0])));
      var k = '';
      for (var i = 1; i <= max; i++) {
        var da = !!map[i];
        k += '<button type="button" class="kachel ' + (da ? (i > soll ? 'extra' : 'an') : '') +
          '" data-lekt="' + block + ':' + i + '">' + i + '</button>';
      }
      return '<div class="raster">' + k + '</div>';
    }

    out += gruppe('Grundstoff', raster('grund', th.grundSoll, th.grundMap), '',
      { label: th.grundIst + ' von ' + th.grundSoll, ziel: 'sub:ausbildung:theorie' });
    out += gruppe('Zusatzstoff', raster('zusatz', th.zusatzSoll, th.zusatzMap),
      'Tippe eine Lektion an, um sie einzutragen oder zu ändern. Eine Doppelstunde dauert 90 Minuten.',
      { label: th.zusatzIst + ' von ' + th.zusatzSoll, ziel: 'sub:ausbildung:theorie' });

    var liste = S.sortiert(state.theorie);
    out += gruppe('Besuchte Stunden' + (liste.length ? ' (' + liste.length + ')' : ''),
      liste.length ? liste.map(function (e) {
        return zeile({
          t: (e.block === 'zusatz' ? 'Zusatzstoff ' : 'Grundstoff ') + e.lektion + (e.thema ? ' · ' + esc(e.thema) : ''),
          u: esc(e.notiz) || (S.erledigt(e) ? 'Doppelstunde' : 'geplant'),
          w: S.datum(e.datum), ziel: 'edit:theorie:' + e.id
        });
      }).join('') : leer('Noch keine Theoriestunde eingetragen.'));

    return out;
  }

  function teilPruefungen() {
    var out = '';
    var theoriePr = S.bestanden(state, 'theorie');
    if (theoriePr) {
      out += gruppe('Frist', zeile({
        t: 'Praktische Prüfung bis ' + S.datum(S.addMonths(theoriePr.datum, 12)),
        u: 'Theorie bestanden am ' + S.datum(theoriePr.datum)
      }), 'Die bestandene Theorieprüfung verfällt zwölf Monate nach dem Prüfungstag (§ 18 Abs. 2 FeV).');
    }

    [['theorie', 'Theoretische Prüfung'], ['praxis', 'Praktische Prüfung']].forEach(function (paar) {
      var liste = S.pruefungenNach(state, paar[0]);
      out += gruppe(paar[1], liste.length ? liste.map(function (p) {
        var text = p.status === 'bestanden' ? 'bestanden'
          : p.status === 'nichtBestanden' ? 'nicht bestanden'
            : (S.erledigt(p) ? 'ohne Ergebnis' : 'geplant');
        var extra = [];
        if (p.fehlerpunkte !== null && p.fehlerpunkte !== undefined) extra.push(p.fehlerpunkte + ' Fehlerpunkte');
        if (p.notiz) extra.push(esc(p.notiz));
        return zeile({
          t: p.versuch + '. Versuch', u: extra.join(' · ') || S.datum(p.datum, true),
          marke: text, markeKlasse: p.status === 'bestanden' ? 'marke--gruen' : p.status === 'nichtBestanden' ? 'marke--rot' : '',
          w: p.kosten > 0 ? S.eur(p.kosten) : '', wUnter: p.kosten > 0 ? S.datum(p.datum) : '',
          ziel: 'edit:pruefung:' + p.id
        });
      }).join('') : leer('Noch kein Termin eingetragen.'));
    });

    out += '<p class="gruppe__fuss">Jeder Versuch bekommt einen eigenen Eintrag mit eigener Gebühr. So stimmt die Kostenrechnung auch nach einer Wiederholung. Eine nicht bestandene Prüfung darf in der Regel erst nach zwei Wochen wiederholt werden.</p>';
    return out;
  }

  /* ---------- Kosten ---------- */

  function ansichtKosten() {
    var k = S.kostenStats(state);
    var unter = nav.sub.kosten;
    var out = '<section class="gruppe"><div class="karte">' +
      '<div class="gross"><div class="gross__z num">' + S.eur(k.gesamt) + '</div>' +
      '<p class="gross__u">bisher angefallen</p></div>' +
      '<div class="dreier">' +
      '<div><b class="num">' + S.eur(k.bezahlt) + '</b><span>bezahlt</span></div>' +
      '<div><b class="num">' + S.eur(Math.abs(k.offen)) + '</b><span>' + (k.offen >= 0 ? 'offen' : 'Guthaben') + '</span></div>' +
      '<div><b class="num">' + S.pct(k.bezahlt, k.gesamt) + '%</b><span>beglichen</span></div>' +
      '</div></div></section>';

    out += seg('kosten', unter, [['uebersicht', 'Übersicht'], ['zahlungen', 'Zahlungen'], ['posten', 'Posten']]);

    if (unter === 'uebersicht') {
      var reihen = zeile({ t: 'Fahrstunden', w: S.eur(k.fahrstunden) }) +
        zeile({ t: 'Prüfungsgebühren', w: S.eur(k.pruefungen) });
      Object.keys(k.nachKategorie).forEach(function (kat) {
        reihen += zeile({ t: esc(S.KOSTEN_KATEGORIEN[kat] || kat), w: S.eur(k.nachKategorie[kat]) });
      });
      out += gruppe('Aufschlüsselung', reihen);

      var pg = S.prognose(state);
      if (pg.belastbar || pg.posten.length) {
        out += gruppe('Hochrechnung',
          zeile({ t: 'Voraussichtlich gesamt', w: S.eur(pg.gesamt), klasse: 'zeile--fett' }) +
          pg.posten.map(function (p) { return zeile({ t: esc(p.label), w: S.eur(p.betrag) }); }).join(''),
          'Grobe Schätzung aus deinen Durchschnittspreisen. Fährst du Sonderfahrten im Schaltwagen, zählt die App sie doppelt, dann liegt die echte Summe niedriger.');
      } else {
        out += gruppe('Hochrechnung', zeile({ t: 'Preise hinterlegen', u: 'Dann rechnet die App die Endsumme hoch', ziel: 'seite:preise', klasse: 'zeile--akzent' }));
      }
      var d = diagramm();
      if (d) out += gruppe('Verlauf', d);
    } else if (unter === 'zahlungen') {
      var zl = S.sortiert(state.zahlungen);
      out += gruppe('Deine Raten' + (zl.length ? ' (' + zl.length + ')' : ''),
        zl.length ? zl.map(function (e) {
          return zeile({ t: esc(e.art || 'Zahlung'), u: esc(e.notiz) || S.datum(e.datum, true), w: S.eur(e.betrag), wUnter: S.datum(e.datum), ziel: 'edit:zahlung:' + e.id });
        }).join('') : leer('Noch keine Zahlung eingetragen.'),
        'Hier trägst du ein, was du wirklich überwiesen oder bezahlt hast.');
    } else {
      var pl = S.sortiert(state.kosten);
      out += gruppe('Einzelposten' + (pl.length ? ' (' + pl.length + ')' : ''),
        pl.length ? pl.map(function (e) {
          return zeile({ t: esc(e.bezeichnung), u: esc(S.KOSTEN_KATEGORIEN[e.kategorie] || 'Sonstiges'), w: S.eur(e.betrag), wUnter: S.datum(e.datum), ziel: 'edit:kosten:' + e.id });
        }).join('') : leer('Sehtest, Erste Hilfe, Anmeldegebühr und Ähnliches kommen hierher.'),
        'Prüfungsgebühren gehören zur jeweiligen Prüfung, nicht hierher.');
    }
    return out;
  }

  function diagramm() {
    var p = [];
    state.fahrstunden.forEach(function (e) { if (S.erledigt(e) && e.kosten > 0) p.push({ d: e.datum, k: e.kosten, z: 0 }); });
    state.pruefungen.forEach(function (e) { if (S.erledigt(e) && e.kosten > 0) p.push({ d: e.datum, k: e.kosten, z: 0 }); });
    state.kosten.forEach(function (e) { if (S.erledigt(e) && e.betrag > 0) p.push({ d: e.datum, k: e.betrag, z: 0 }); });
    state.zahlungen.forEach(function (e) { if (S.erledigt(e) && e.betrag > 0) p.push({ d: e.datum, k: 0, z: e.betrag }); });
    if (p.length < 2) return '';
    p.sort(function (a, b) { return a.d < b.d ? -1 : 1; });
    var t0 = S.parseISO(p[0].d).getTime(), t1 = S.parseISO(p[p.length - 1].d).getTime();
    var spanne = Math.max(1, t1 - t0), sk = 0, sz = 0, max = 1;
    var reihe = p.map(function (x) {
      sk += x.k; sz += x.z; max = Math.max(max, sk, sz);
      return { x: (S.parseISO(x.d).getTime() - t0) / spanne * 300, k: sk, z: sz };
    });
    function pfad(feld) {
      return reihe.map(function (r) { return r.x.toFixed(1) + ',' + (108 - r[feld] / max * 96).toFixed(1); }).join(' ');
    }
    return '<svg class="diagramm" viewBox="0 0 300 120" preserveAspectRatio="none">' +
      '<polygon class="diagramm__f" points="0,108 ' + pfad('k') + ' 300,108"/>' +
      '<polyline class="diagramm__l" points="' + pfad('k') + '"/>' +
      '<polyline class="diagramm__l" style="stroke-dasharray:4 4;opacity:.55" points="' + pfad('z') + '"/>' +
      '</svg>' +
      zeile({ t: 'Kosten', w: S.eur(sk) }) + zeile({ t: 'Bezahlt', w: S.eur(sz) });
  }

  /* ---------- Mehr ---------- */

  function ansichtMehr() {
    var b = S.badges(state);
    var frei = b.filter(function (x) { return x.ok; }).length;
    var formOffen = S.FORMALITAETEN.filter(function (f) { return !state.formalitaeten[f.key].done; }).length;

    return gruppe('Ausbildung',
      zeile({ t: 'Meilensteine', u: frei + ' von ' + b.length + ' freigeschaltet', icon: ICON.stern, ziel: 'seite:meilensteine' }) +
      zeile({ t: 'Formalitäten', u: formOffen ? formOffen + ' noch offen' : 'alles erledigt', icon: ICON.haken2, ziel: 'seite:formalitaeten' }) +
      zeile({ t: 'Prüfungsreife', u: S.pruefungsreife(state).prozent + '% erfüllt', icon: ICON.flagge, ziel: 'seite:reife' })) +
      gruppe('Einstellungen',
        zeile({ t: 'Darstellung', u: farbName(), icon: ICON.farbe, ziel: 'seite:darstellung' }) +
        zeile({ t: 'App', u: 'Fahrschule, Klasse, Vorgaben', icon: ICON.zahn, ziel: 'seite:app' }) +
        zeile({ t: 'Pflichtwerte', u: state.settings.ziele.ueberland + '/' + state.settings.ziele.autobahn + '/' + state.settings.ziele.nacht + ' Sonderfahrten', icon: ICON.liste, ziel: 'seite:pflichtwerte' }) +
        zeile({ t: 'Preise & Hochrechnung', icon: ICON.euro, ziel: 'seite:preise' })) +
      gruppe('Daten',
        zeile({ t: 'Backup & Daten', icon: ICON.pfeilRunter, ziel: 'seite:daten' }) +
        zeile({ t: 'Installation prüfen', icon: ICON.handy, ziel: 'seite:installation' })) +
      gruppe('Info',
        zeile({ t: 'Gesetzliche Grundlagen', icon: ICON.buch, ziel: 'seite:rechtliches' }) +
        zeile({ t: 'Version', w: APP_VERSION }));
  }

  function farbName() {
    var a = S.AKZENTE.filter(function (x) { return x.id === ui().akzent; })[0];
    return (a ? a.name : '') + ' · ' + (ui().design === 'system' ? 'System' : ui().design === 'dunkel' ? 'Dunkel' : 'Hell');
  }

  /* ---------- Unterseiten ---------- */

  function feldZeile(pfad, label, art, extra) {
    var wert = holeWert(pfad);
    if (art === 'text') {
      return '<label class="feld"><span>' + esc(label) + '</span>' +
        '<input type="text" data-pfad="' + pfad + '" value="' + esc(wert) + '" placeholder="' + esc(extra || '') + '"></label>';
    }
    if (art === 'zahl') {
      return '<label class="feld"><span>' + esc(label) + '</span>' +
        '<input type="number" inputmode="decimal" step="' + (extra || '1') + '" min="0" data-pfad="' + pfad + '" value="' + esc(wert) + '"></label>';
    }
    if (art === 'geld') {
      return '<label class="feld"><span>' + esc(label) + '</span>' +
        '<input type="text" inputmode="decimal" data-pfad="' + pfad + '" value="' + (wert ? esc(String(wert).replace('.', ',')) : '') + '" placeholder="0,00"></label>';
    }
    if (art === 'schalter') {
      return '<label class="feld"><span>' + esc(label) + '</span>' +
        '<input type="checkbox" class="schalter" data-pfad="' + pfad + '"' + (wert ? ' checked' : '') + '></label>';
    }
    if (art === 'auswahl') {
      return '<label class="feld"><span>' + esc(label) + '</span><select data-pfad="' + pfad + '">' +
        extra.map(function (o) {
          return '<option value="' + esc(o[0]) + '"' + (String(wert) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
        }).join('') + '</select></label>';
    }
    return '';
  }

  function holeWert(pfad) {
    var t = pfad.split('.'), o = state.settings;
    for (var i = 0; i < t.length; i++) { if (o === undefined || o === null) return ''; o = o[t[i]]; }
    return o === undefined || o === null ? '' : o;
  }

  function setzeWert(pfad, wert) {
    var t = pfad.split('.'), o = state.settings;
    for (var i = 0; i < t.length - 1; i++) o = o[t[i]];
    o[t[t.length - 1]] = wert;
    speichern();
  }

  var SEITEN = {
    reife: {
      titel: 'Prüfungsreife',
      html: function () {
        var r = S.pruefungsreife(state);
        return '<section class="gruppe"><div class="karte"><div class="ringgross">' + ring(r.prozent, 124, 10) +
          '<p class="ringgross__u">' +
          (r.offen.length ? r.offen.length + ' von ' + r.items.length + ' Punkten offen' : 'Alles erfüllt') +
          '</p></div></div></section>' +
          gruppe('Zulassung zur praktischen Prüfung', r.items.map(function (i) {
            return '<div class="pruefzeile ' + (i.ok ? 'ok' : 'warte') + '">' +
              '<span class="pruefzeile__i">' + (i.ok ? ICON.haken : ICON.punkt) + '</span>' +
              '<span><span class="pruefzeile__t">' + esc(i.label) + '</span>' +
              '<span class="pruefzeile__u">' + esc(i.detail) + '</span></span></div>';
          }).join(''), 'Die Fahrschule meldet dich erst an, wenn alle Punkte stehen.');
      }
    },

    meilensteine: {
      titel: 'Meilensteine',
      html: function () {
        var b = S.badges(state);
        return gruppe('', '<div class="mst">' + b.map(function (x) {
          return '<div class="mst__e ' + (x.ok ? 'an' : '') + '">' +
            '<span class="mst__i">' + ICON.haken + '</span>' +
            '<span class="mst__t">' + esc(x.label) + '</span></div>';
        }).join('') + '</div>') +
          gruppe('Beschreibung', b.map(function (x) {
            return zeile({ t: esc(x.label), u: esc(x.desc), marke: x.ok ? 'geschafft' : '', markeKlasse: 'marke--gruen' });
          }).join(''));
      }
    },

    formalitaeten: {
      titel: 'Formalitäten',
      html: function () {
        return gruppe('Vor der Prüfung zu erledigen', S.FORMALITAETEN.map(function (f) {
          var v = state.formalitaeten[f.key];
          return '<label class="feld"><span>' + esc(f.label) +
            (v.done && v.datum ? '<br><small style="color:var(--fg2)">' + S.datum(v.datum) + '</small>' : '') + '</span>' +
            '<input type="checkbox" class="schalter" data-formal="' + f.key + '"' + (v.done ? ' checked' : '') + '></label>';
        }).join(''), 'Das Datum setzt die App automatisch auf den Tag, an dem du den Haken setzt.');
      }
    },

    darstellung: {
      titel: 'Darstellung',
      html: function () {
        return gruppe('Design',
          '<div class="wahl">' + [['hell', 'Hell'], ['dunkel', 'Dunkel'], ['system', 'System']].map(function (o) {
            return '<button type="button" class="wahl__b ' + (ui().design === o[0] ? 'an' : '') + '" data-set="ui.design:' + o[0] + '">' + o[1] + '</button>';
          }).join('') + '</div>') +
          gruppe('Akzentfarbe',
            '<div class="farben">' + S.AKZENTE.map(function (a) {
              return '<button type="button" class="farbe ' + (ui().akzent === a.id ? 'an' : '') + '" data-set="ui.akzent:' + a.id + '">' +
                '<span class="farbe__p" style="background:' + a.probe + '"></span>' +
                '<span class="farbe__n">' + esc(a.name) + '</span></button>';
            }).join('') + '</div>') +
          gruppe('Schriftgröße',
            '<div class="wahl">' + [['klein', 'Klein'], ['normal', 'Normal'], ['gross', 'Groß']].map(function (o) {
              return '<button type="button" class="wahl__b ' + (ui().schrift === o[0] ? 'an' : '') + '" data-set="ui.schrift:' + o[0] + '">' + o[1] + '</button>';
            }).join('') + '</div>') +
          gruppe('Weiteres',
            feldZeile('ui.kompakt', 'Kompakte Zeilen', 'schalter') +
            feldZeile('ui.animationen', 'Animationen', 'schalter'),
            'Kompakte Zeilen bringen mehr auf den Bildschirm, Animationen kosten etwas Akku.');
      }
    },

    app: {
      titel: 'App',
      html: function () {
        return gruppe('Du',
          feldZeile('name', 'Dein Name', 'text', 'für die Begrüßung')) +
          gruppe('Fahrschule',
            feldZeile('fahrschule', 'Name', 'text', 'Fahrschule') +
          feldZeile('klasse', 'Klasse', 'auswahl', [['B197', 'B197'], ['B', 'B']]),
          'Bei B197 prüft die App zusätzlich Schaltstunden und Testfahrt.') +
          gruppe('Beim Eintragen',
            feldZeile('standard.ue', 'Voreingestellte Dauer (UE)', 'zahl', '0.5') +
            feldZeile('standard.preis', 'Voreingestellter Preis (€)', 'geld'),
            'Diese Werte stehen schon im Formular, wenn du eine neue Fahrstunde anlegst.') +
          gruppe('Ziele',
            feldZeile('wochenziel', 'Wochenziel (UE)', 'zahl', '0.5'),
            'Null blendet die Wochenanzeige auf der Übersicht aus.') +
          gruppe('Start',
            feldZeile('ui.start', 'Startansicht', 'auswahl', [['uebersicht', 'Übersicht'], ['ausbildung', 'Ausbildung'], ['kosten', 'Kosten']]));
      }
    },

    pflichtwerte: {
      titel: 'Pflichtwerte',
      html: function () {
        return gruppe('Sonderfahrten (Unterrichtseinheiten)',
          feldZeile('ziele.ueberland', 'Überland', 'zahl') +
          feldZeile('ziele.autobahn', 'Autobahn', 'zahl') +
          feldZeile('ziele.nacht', 'Nacht', 'zahl')) +
          gruppe('Theorie (Doppelstunden)',
            feldZeile('ziele.theorieGrund', 'Grundstoff', 'zahl') +
            feldZeile('ziele.theorieZusatz', 'Zusatzstoff', 'zahl')) +
          gruppe('B197',
            feldZeile('ziele.schaltUE', 'Schaltstunden', 'zahl') +
            feldZeile('ziele.testfahrtMin', 'Testfahrt (Minuten)', 'zahl'),
            'Voreingestellt sind die gesetzlichen Mindestwerte. Ändere sie nur, wenn deine Fahrschule oder die Rechtslage etwas anderes vorgibt.');
      }
    },

    preise: {
      titel: 'Preise',
      html: function () {
        var pm = S.preisModell(state);
        return gruppe('Preise deiner Fahrschule',
          feldZeile('preise.fahrstunde', 'Übungsfahrstunde', 'geld') +
          feldZeile('preise.sonderfahrt', 'Sonderfahrt', 'geld') +
          feldZeile('preise.pruefungTheorie', 'Theorieprüfung', 'geld') +
          feldZeile('preise.pruefungPraxis', 'Praktische Prüfung', 'geld'),
          'Leer oder null heißt: Die App rechnet mit dem Durchschnitt deiner Einträge. Aktuell ' +
          (pm.quelle === 'keine' ? 'liegen noch keine Werte vor.' :
            'rechnet sie mit ' + S.eur(pm.fahrstunde) + ' je Übungsstunde und ' + S.eur(pm.sonderfahrt) + ' je Sonderfahrt.')) +
          gruppe('Noch geplant',
            feldZeile('geplanteUebungsstunden', 'Weitere Übungsstunden (UE)', 'zahl'),
            'Fließt in die Hochrechnung ein, damit die Endsumme realistischer wird.');
      }
    },

    daten: {
      titel: 'Backup & Daten',
      html: function () {
        var anzahl = state.fahrstunden.length + state.theorie.length + state.kosten.length +
          state.zahlungen.length + state.pruefungen.length;
        var kb = 0;
        try { kb = Math.round(JSON.stringify(state).length / 102.4) / 10; } catch (e) { }
        return gruppe('Sichern',
          '<div class="knopfreihe"><button type="button" class="knopf" id="btnExport">Backup speichern</button>' +
          '<button type="button" class="knopf knopf--leise" id="btnImport">Backup laden</button></div>' +
          '<input type="file" id="dateiImport" accept="application/json,.json" hidden>',
          'Die JSON-Datei enthält alles und lässt sich auf einem anderen Gerät wieder einspielen.') +
          gruppe('Speicher',
            zeile({ t: 'Einträge', w: String(anzahl) }) +
            zeile({ t: 'Belegt', w: String(kb).replace('.', ',') + ' kB' }) +
            zeile({ t: 'Angelegt am', w: S.datum(state.erstellt) })) +
          gruppe('Zurücksetzen',
            '<div class="knopfreihe"><button type="button" class="knopf knopf--rot" id="btnReset">Alle Daten löschen</button></div>',
            'Vorher ein Backup speichern. Löschen lässt sich nicht rückgängig machen.');
      }
    },

    installation: {
      titel: 'Installation',
      html: function () {
        return gruppe('Prüfung läuft', '<div id="pruefliste">' +
          ['https', 'manifest', 'icon192', 'icon512', 'sw', 'modus'].map(function (k) {
            return '<div class="pruefzeile warte" id="pf-' + k + '"><span class="pruefzeile__i">' + ICON.uhr + '</span>' +
              '<span><span class="pruefzeile__t">wird geprüft …</span><span class="pruefzeile__u"></span></span></div>';
          }).join('') + '</div>') +
          gruppe('Aktionen',
            '<div class="knopfreihe">' +
            '<button type="button" class="knopf" id="btnInstall" disabled>App installieren</button>' +
            '<button type="button" class="knopf knopf--leise" id="btnCache">Cache leeren und neu laden</button></div>',
            'Der Installieren-Knopf wird aktiv, sobald der Browser die App als installierbar erkennt. In Safari auf dem iPhone gibt es ihn nicht: dort Teilen und dann Zum Home-Bildschirm.');
      },
      danach: function () { pruefeInstallation(); }
    },

    rechtliches: {
      titel: 'Grundlagen',
      html: function () {
        return gruppe('Klasse B',
          zeile({ t: 'Sonderfahrten', u: '5 Überland, 4 Autobahn, 3 Nacht, je 45 Minuten', w: '§ 5' }) +
          zeile({ t: 'Theorieunterricht', u: '12 Doppelstunden Grundstoff, 2 Zusatzstoff', w: 'FahrschAusbO' }),
          'Für Übungsfahrstunden gibt es keine gesetzliche Mindestzahl.') +
          gruppe('B197',
            zeile({ t: 'Schaltstunden', u: 'mindestens 10 Fahrstunden à 45 Minuten auf einem Schaltwagen', w: '§ 5a' }) +
            zeile({ t: 'Testfahrt', u: 'mindestens 15 Minuten innerorts und außerorts, vom Fahrlehrer bescheinigt', w: '§ 5a' })) +
          gruppe('Fristen',
            zeile({ t: 'Praktische Prüfung', u: 'innerhalb von 12 Monaten nach bestandener Theorieprüfung', w: '§ 18' }) +
            zeile({ t: 'Wiederholung', u: 'in der Regel frühestens nach zwei Wochen', w: '§ 18' }) +
            zeile({ t: 'Führerschein abholen', u: 'spätestens zwei Jahre nach der Prüfung', w: '§ 18' }),
            'Stand August 2026, ohne Gewähr. Im Zweifel gilt, was deine Fahrschule sagt.');
      }
    }
  };

  /* ================= Installations-Prüfung ================= */

  function setzePruef(key, ok, titel, unter) {
    var el = $('pf-' + key);
    if (!el) return;
    el.className = 'pruefzeile ' + (ok === null ? 'warte' : ok ? 'ok' : 'weg');
    el.querySelector('.pruefzeile__i').innerHTML = ok === null ? ICON.uhr : ok ? ICON.haken : ICON.kreuz;
    el.querySelector('.pruefzeile__t').textContent = titel;
    el.querySelector('.pruefzeile__u').textContent = unter || '';
  }

  function pruefeInstallation() {
    var https = location.protocol === 'https:' || location.hostname === 'localhost';
    setzePruef('https', https, 'Sichere Verbindung', https ? location.origin : 'Ohne HTTPS lässt sich keine App installieren.');

    var stand = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    setzePruef('modus', true, stand ? 'Läuft als App' : 'Läuft im Browser',
      stand ? 'Die Installation hat geklappt.' : 'Noch als Webseite geöffnet.');

    fetch('manifest.json', { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    }).then(function (m) {
      setzePruef('manifest', true, 'manifest.json gefunden', 'Name: ' + (m.short_name || m.name));
      pruefeIcon('icon192', '192x192');
      pruefeIcon('icon512', '512x512');
    }).catch(function (e) {
      setzePruef('manifest', false, 'manifest.json fehlt', 'Die Datei liegt nicht neben der index.html. Ohne sie gibt es nur eine Verknüpfung.');
      setzePruef('icon192', false, 'Icon 192 nicht prüfbar', '');
      setzePruef('icon512', false, 'Icon 512 nicht prüfbar', '');
    });

    function pruefeIcon(key, groesse) {
      var datei = groesse === '192x192' ? 'icon-192.png' : 'icon-512.png';
      fetch(datei, { cache: 'no-store' }).then(function (r) {
        var typ = r.headers.get('content-type') || '';
        var ok = r.ok && typ.indexOf('image/png') === 0;
        setzePruef(key, ok, 'Icon ' + groesse + (ok ? ' vorhanden' : ' fehlt'),
          ok ? datei : datei + ' ist nicht erreichbar. Genau dieser Dateiname muss neben der index.html liegen.');
      }).catch(function () {
        setzePruef(key, false, 'Icon ' + groesse + ' fehlt', datei + ' ist nicht erreichbar.');
      });
    }

    if (!('serviceWorker' in navigator)) {
      setzePruef('sw', false, 'Service Worker nicht unterstützt', 'Dieser Browser kann keine Apps installieren.');
    } else {
      navigator.serviceWorker.getRegistration().then(function (reg) {
        if (reg && (reg.active || reg.installing)) {
          setzePruef('sw', true, 'Service Worker aktiv', 'Offline-Betrieb steht bereit.');
        } else {
          setzePruef('sw', false, 'Service Worker nicht aktiv', 'Seite einmal neu laden. Fehlt sw.js im Repo, wird die App nicht installierbar.');
        }
      }).catch(function () {
        setzePruef('sw', false, 'Service Worker nicht lesbar', '');
      });
    }

    var knopf = $('btnInstall');
    if (knopf) {
      if (installEreignis) {
        knopf.disabled = false;
        knopf.textContent = 'App installieren';
      } else {
        knopf.disabled = true;
        knopf.textContent = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
          ? 'Bereits installiert' : 'Warte auf den Browser …';
      }
    }
  }

  /* ================= Formulare ================= */

  var TITEL = { fahrstunde: 'Fahrstunde', theorie: 'Theoriestunde', kosten: 'Einzelposten', zahlung: 'Zahlung', pruefung: 'Prüfung' };
  var LISTEN = { fahrstunde: 'fahrstunden', theorie: 'theorie', kosten: 'kosten', zahlung: 'zahlungen', pruefung: 'pruefungen' };

  var STANDARD = {
    fahrstunde: function () {
      return {
        datum: heute(), art: 'grund',
        getriebe: state.settings.klasse === 'B197' ? 'automatik' : 'schalt',
        ue: state.settings.standard.ue || 2, minuten: 0,
        kosten: state.settings.standard.preis ? state.settings.standard.preis * (state.settings.standard.ue || 2) : '',
        fahrlehrer: '', bewertung: 0, notiz: ''
      };
    },
    theorie: function () { return { datum: heute(), block: 'grund', lektion: 1, thema: '', notiz: '' }; },
    kosten: function () { return { datum: heute(), bezeichnung: '', betrag: '', kategorie: 'grundgebuehr' }; },
    zahlung: function () { return { datum: heute(), betrag: '', art: 'Überweisung', notiz: '' }; },
    pruefung: function () { return { datum: heute(), typ: 'theorie', status: 'geplant', kosten: '', fehlerpunkte: '', notiz: '' }; }
  };

  function fDatum(v) {
    return '<label class="feld"><span>Datum</span><input type="date" name="datum" value="' + esc(v || heute()) + '"></label>';
  }
  function fText(name, label, v, modus, platz) {
    return '<label class="feld"><span>' + esc(label) + '</span><input type="text" inputmode="' + (modus || 'text') +
      '" name="' + name + '" value="' + esc(v === null || v === undefined ? '' : v) + '" placeholder="' + esc(platz || '') + '" autocomplete="off"></label>';
  }
  function fZahl(name, label, v, schritt) {
    return '<label class="feld"><span>' + esc(label) + '</span><input type="number" inputmode="decimal" min="0" step="' +
      schritt + '" name="' + name + '" value="' + esc(v === null || v === undefined ? '' : v) + '"></label>';
  }
  function fNotiz(v) {
    return '<label class="feld feld--breit"><span>Notiz</span><textarea name="notiz" rows="2" placeholder="Optional">' + esc(v || '') + '</textarea></label>';
  }
  function fAuswahl(name, label, wert, paare) {
    return '<label class="feld"><span>' + esc(label) + '</span><select name="' + name + '">' + paare.map(function (p) {
      return '<option value="' + esc(p[0]) + '"' + (String(wert) === String(p[0]) ? ' selected' : '') + '>' + esc(p[1]) + '</option>';
    }).join('') + '</select></label>';
  }
  function fWahl(name, wert, paare, spalten) {
    return '<div class="wahl" data-wahl="' + name + '"' + (spalten ? ' style="grid-template-columns:repeat(' + spalten + ',1fr)"' : '') + '>' +
      paare.map(function (p) {
        return '<button type="button" class="wahl__b ' + (p[0] === wert ? 'an' : '') + '" data-wahlwert="' + p[0] + '">' + esc(p[1]) + '</button>';
      }).join('') + '<input type="hidden" name="' + name + '" value="' + esc(wert) + '"></div>';
  }

  var FORMULAR = {
    fahrstunde: function (d) {
      var b197 = state.settings.klasse === 'B197';
      return gruppe('Art', fWahl('art', d.art, [
        ['grund', 'Übung'], ['ueberland', 'Überland'], ['autobahn', 'Autobahn'],
        ['nacht', 'Nacht'], ['testfahrt', 'Testfahrt']
      ], 3)) +
        (b197 ? gruppe('Fahrzeug', fWahl('getriebe', d.getriebe, [['automatik', 'Automatik'], ['schalt', 'Schaltwagen']], 2),
          'Nur Stunden im Schaltwagen zählen auf die ' + state.settings.ziele.schaltUE + ' Pflichtstunden für die 197.') : '') +
        gruppe('Angaben', fDatum(d.datum) +
          fZahl('ue', 'Einheiten à 45 min', d.ue, '0.5') +
          '<div id="zeileMinuten"' + (d.art === 'testfahrt' ? '' : ' hidden') + '>' + fZahl('minuten', 'Dauer in Minuten', d.minuten || state.settings.ziele.testfahrtMin, '1') + '</div>' +
          fText('kosten', 'Kosten (€)', d.kosten, 'decimal', '0,00') +
          fText('fahrlehrer', 'Fahrlehrer', d.fahrlehrer, 'text', 'Optional')) +
        gruppe('Wie lief es?', fWahl('bewertung', String(d.bewertung || 0), [
          ['0', 'ohne'], ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5']
        ], 6) + fNotiz(d.notiz));
    },
    theorie: function (d) {
      var max = Math.max(14, state.settings.ziele.theorieGrund, state.settings.ziele.theorieZusatz);
      var opts = [];
      for (var i = 1; i <= max; i++) opts.push([i, 'Lektion ' + i]);
      return gruppe('Block', fWahl('block', d.block, [['grund', 'Grundstoff'], ['zusatz', 'Zusatzstoff']], 2)) +
        gruppe('Angaben', fDatum(d.datum) + fAuswahl('lektion', 'Lektion', d.lektion, opts) +
          fText('thema', 'Thema', d.thema, 'text', 'Optional') + fNotiz(d.notiz));
    },
    kosten: function (d) {
      var kat = Object.keys(S.KOSTEN_KATEGORIEN).map(function (k) { return [k, S.KOSTEN_KATEGORIEN[k]]; });
      return gruppe('Posten', fDatum(d.datum) +
        fText('bezeichnung', 'Bezeichnung', d.bezeichnung, 'text', 'z. B. Sehtest') +
        fText('betrag', 'Betrag (€)', d.betrag, 'decimal', '0,00') +
        fAuswahl('kategorie', 'Kategorie', d.kategorie, kat),
        'Prüfungsgebühren bitte bei der jeweiligen Prüfung eintragen.');
    },
    zahlung: function (d) {
      var arten = ['Überweisung', 'Bar', 'Karte', 'Lastschrift', 'Sonstiges'].map(function (a) { return [a, a]; });
      return gruppe('Zahlung', fDatum(d.datum) +
        fText('betrag', 'Betrag (€)', d.betrag, 'decimal', '0,00') +
        fAuswahl('art', 'Art', d.art, arten) +
        fText('notiz', 'Notiz', d.notiz, 'text', 'z. B. Rate 2'));
    },
    pruefung: function (d) {
      return gruppe('Prüfung', fWahl('typ', d.typ, [['theorie', 'Theorie'], ['praxis', 'Praxis']], 2)) +
        gruppe('Ergebnis', fWahl('status', d.status, [['geplant', 'Geplant'], ['bestanden', 'Bestanden'], ['nichtBestanden', 'Nicht bestanden']], 3)) +
        gruppe('Angaben', fDatum(d.datum) +
          fText('kosten', 'Gebühr (€)', d.kosten, 'decimal', '0,00') +
          '<div id="zeileFehler"' + (d.typ === 'theorie' ? '' : ' hidden') + '>' +
          fZahl('fehlerpunkte', 'Fehlerpunkte', d.fehlerpunkte, '1') + '</div>' + fNotiz(d.notiz),
          d.typ === 'theorie' ? 'Bestanden ist die Theorieprüfung mit höchstens 10 Fehlerpunkten.' : '');
    }
  };

  function oeffneSheet(titel, inhalt) {
    $('sheetTitel').textContent = titel;
    $('sheetBody').innerHTML = '<div class="sheet__inhalt">' + inhalt + '</div>';
    $('sheet').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function schliesseSheet() {
    $('sheet').hidden = true;
    $('sheetSpeichern').hidden = false;
    $('sheetAbbrechen').textContent = 'Abbrechen';
    sheetCtx = null;
    document.body.style.overflow = '';
  }

  function neuMenue() {
    sheetCtx = null;
    $('sheetSpeichern').hidden = true;
    $('sheetAbbrechen').textContent = 'Schließen';
    oeffneSheet('Neuer Eintrag',
      gruppe('Ausbildung',
        zeile({ t: 'Fahrstunde', u: 'Übung, Sonderfahrt oder Testfahrt', ziel: 'neu:fahrstunde' }) +
        zeile({ t: 'Theoriestunde', u: 'Grundstoff oder Zusatzstoff', ziel: 'neu:theorie' }) +
        zeile({ t: 'Prüfung', u: 'Termin oder Ergebnis', ziel: 'neu:pruefung' })) +
      gruppe('Geld',
        zeile({ t: 'Zahlung', u: 'Rate an die Fahrschule', ziel: 'neu:zahlung' }) +
        zeile({ t: 'Einzelposten', u: 'Sehtest, Erste Hilfe, Gebühren', ziel: 'neu:kosten' })));
  }

  function oeffneForm(typ, id, vorgabe) {
    var d;
    if (id) {
      d = state[LISTEN[typ]].filter(function (e) { return e.id === id; })[0];
      if (!d) return;
      d = JSON.parse(JSON.stringify(d));
      if (d.kosten !== undefined && d.kosten !== '') d.kosten = String(d.kosten).replace('.', ',');
      if (d.betrag !== undefined && d.betrag !== '') d.betrag = String(d.betrag).replace('.', ',');
    } else {
      d = STANDARD[typ]();
      if (d.kosten) d.kosten = String(d.kosten).replace('.', ',');
      if (vorgabe) Object.keys(vorgabe).forEach(function (k) { d[k] = vorgabe[k]; });
    }
    sheetCtx = { typ: typ, id: id || null };
    $('sheetSpeichern').hidden = false;
    $('sheetAbbrechen').textContent = 'Abbrechen';
    oeffneSheet(id ? TITEL[typ] : 'Neue ' + TITEL[typ], FORMULAR[typ](d) +
      (id ? '<div class="knopfreihe"><button type="button" class="knopf knopf--rot" id="btnLoeschen">Eintrag löschen</button></div>' : ''));
  }

  function formLesen() {
    var d = {};
    Array.prototype.forEach.call($('sheetForm').querySelectorAll('[name]'), function (f) { d[f.name] = f.value; });
    return d;
  }

  function fehlerZeigen(fehler) {
    Array.prototype.forEach.call($('sheetBody').querySelectorAll('.fehlertext'), function (n) { n.remove(); });
    Array.prototype.forEach.call($('sheetBody').querySelectorAll('.fehlt'), function (n) { n.classList.remove('fehlt'); });
    var erstes = null;
    Object.keys(fehler).forEach(function (name) {
      var feld = $('sheetBody').querySelector('[name="' + name + '"]');
      if (!feld) return;
      var kasten = feld.closest('.feld') || feld.closest('.wahl') || feld.parentNode;
      kasten.classList.add('fehlt');
      var s = document.createElement('span');
      s.className = 'fehlertext';
      s.textContent = fehler[name];
      kasten.parentNode.insertBefore(s, kasten.nextSibling);
      if (!erstes) erstes = kasten;
    });
    if (erstes && erstes.scrollIntoView) erstes.scrollIntoView({ block: 'center' });
  }

  function sichern() {
    if (!sheetCtx) return;
    var typ = sheetCtx.typ, d = formLesen();
    var p = S.validiere(typ, d);
    if (!p.ok) { fehlerZeigen(p.fehler); return; }

    var e;
    if (typ === 'fahrstunde') {
      e = {
        datum: d.datum, art: d.art,
        getriebe: d.art === 'testfahrt' ? 'schalt' : (state.settings.klasse === 'B197' ? d.getriebe : 'schalt'),
        ue: S.num(d.ue), minuten: d.art === 'testfahrt' ? S.num(d.minuten) : 0,
        kosten: S.num(d.kosten), fahrlehrer: (d.fahrlehrer || '').trim(),
        bewertung: S.num(d.bewertung), notiz: (d.notiz || '').trim()
      };
    } else if (typ === 'theorie') {
      e = { datum: d.datum, block: d.block, lektion: S.num(d.lektion), thema: (d.thema || '').trim(), notiz: (d.notiz || '').trim() };
    } else if (typ === 'kosten') {
      e = { datum: d.datum, bezeichnung: d.bezeichnung.trim(), betrag: S.num(d.betrag), kategorie: d.kategorie };
    } else if (typ === 'zahlung') {
      e = { datum: d.datum, betrag: S.num(d.betrag), art: d.art, notiz: (d.notiz || '').trim() };
    } else {
      e = {
        datum: d.datum, typ: d.typ, status: d.status, kosten: S.num(d.kosten),
        fehlerpunkte: d.typ === 'theorie' && d.fehlerpunkte !== '' ? S.num(d.fehlerpunkte) : null,
        notiz: (d.notiz || '').trim()
      };
    }

    var liste = state[LISTEN[typ]];
    if (sheetCtx.id) {
      for (var i = 0; i < liste.length; i++) if (liste[i].id === sheetCtx.id) { e.id = sheetCtx.id; liste[i] = e; break; }
    } else { e.id = S.uid(); liste.push(e); }

    speichern();
    schliesseSheet();
    render();
    hinweis(TITEL[typ] + ' gesichert');
  }

  function loeschen() {
    if (!sheetCtx || !sheetCtx.id) return;
    var typ = sheetCtx.typ, liste = state[LISTEN[typ]], idx = -1;
    for (var i = 0; i < liste.length; i++) if (liste[i].id === sheetCtx.id) { idx = i; break; }
    if (idx < 0) return;
    var kopie = JSON.parse(JSON.stringify(liste[idx]));
    liste.splice(idx, 1);
    speichern();
    schliesseSheet();
    render();
    undoDaten = { liste: LISTEN[typ], eintrag: kopie, index: idx };
    hinweis(TITEL[typ] + ' gelöscht', true);
  }

  /* ================= Hinweisbalken ================= */

  function hinweis(text, mitUndo) {
    $('hinweisText').textContent = text;
    $('hinweisAktion').hidden = !mitUndo;
    $('hinweisbalken').hidden = false;
    clearTimeout(undoTimer);
    undoTimer = setTimeout(function () {
      $('hinweisbalken').hidden = true;
      undoDaten = null;
    }, mitUndo ? 7000 : 2400);
  }

  function rueckgaengig() {
    if (!undoDaten) return;
    var liste = state[undoDaten.liste];
    liste.splice(Math.min(undoDaten.index, liste.length), 0, undoDaten.eintrag);
    undoDaten = null;
    speichern();
    render();
    $('hinweisbalken').hidden = true;
    hinweis('Wiederhergestellt');
  }

  /* ================= Backup ================= */

  function exportieren() {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'schaltpunkt-backup-' + heute() + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    hinweis('Backup gespeichert');
  }

  function importieren(datei) {
    var leser = new FileReader();
    leser.onload = function () {
      var neu;
      try { neu = S.migrate(JSON.parse(String(leser.result))); }
      catch (e) { hinweis('Keine gültige Backup-Datei'); return; }
      var anzahl = neu.fahrstunden.length + neu.theorie.length + neu.kosten.length + neu.zahlungen.length + neu.pruefungen.length;
      if (!confirm('Backup mit ' + anzahl + ' Einträgen laden?\n\nAlles, was jetzt in der App steht, wird ersetzt.')) return;
      state = neu;
      speichern();
      render();
      hinweis(anzahl + ' Einträge geladen');
    };
    leser.onerror = function () { hinweis('Datei nicht lesbar'); };
    leser.readAsText(datei);
  }

  function allesLoeschen() {
    if (!confirm('Wirklich alle Daten löschen?\n\nFahrstunden, Theorie, Kosten und Prüfungen sind danach weg.')) return;
    if (!confirm('Letzte Frage: endgültig löschen?')) return;
    state = S.emptyState();
    speichern();
    render();
    hinweis('Alle Daten gelöscht');
  }

  /* ================= Ereignisse ================= */

  function geheZu(ziel) {
    var t = ziel.split(':');
    if (t[0] === 'tab') zuTab(t[1]);
    else if (t[0] === 'seite') zuSeite(t[1]);
    else if (t[0] === 'sub') { nav.sub[t[1]] = t[2]; zuTab(t[1]); }
    else if (t[0] === 'neu') { schliesseSheet(); oeffneForm(t[1]); }
    else if (t[0] === 'edit') oeffneForm(t[1], t[2]);
  }

  function bindeEreignisse() {
    $('leiste').addEventListener('click', function (e) {
      var r = e.target.closest('.reiter');
      if (!r) return;
      if (r.id === 'btnNeu') return neuMenue();
      zuTab(r.dataset.tab);
    });

    $('btnZurueck').addEventListener('click', zurueck);

    document.addEventListener('click', function (e) {
      var go = e.target.closest('[data-go]');
      if (go) { geheZu(go.dataset.go); return; }

      var lekt = e.target.closest('[data-lekt]');
      if (lekt) {
        var l = lekt.dataset.lekt.split(':');
        var th = S.theorieStats(state);
        var vorhanden = (l[0] === 'zusatz' ? th.zusatzMap : th.grundMap)[Number(l[1])];
        if (vorhanden) oeffneForm('theorie', vorhanden.id);
        else oeffneForm('theorie', null, { block: l[0], lektion: Number(l[1]) });
        return;
      }

      var set = e.target.closest('[data-set]');
      if (set) {
        var s = set.dataset.set.split(':');
        setzeWert(s[0], s[1]);
        render();
        return;
      }

      var segb = e.target.closest('.seg__b');
      if (segb) {
        var box = segb.closest('.seg');
        nav.sub[box.dataset.segname] = segb.dataset.segwert;
        render();
        return;
      }

      var wahl = e.target.closest('[data-wahlwert]');
      if (wahl) {
        var kasten = wahl.closest('.wahl');
        Array.prototype.forEach.call(kasten.querySelectorAll('.wahl__b'), function (b) { b.classList.remove('an'); });
        wahl.classList.add('an');
        kasten.querySelector('input').value = wahl.dataset.wahlwert;
        var feldname = kasten.dataset.wahl;
        if (feldname === 'art' && $('zeileMinuten')) $('zeileMinuten').hidden = wahl.dataset.wahlwert !== 'testfahrt';
        if (feldname === 'typ' && $('zeileFehler')) $('zeileFehler').hidden = wahl.dataset.wahlwert !== 'theorie';
        return;
      }

      if (e.target.closest('[data-schliessen]')) { schliesseSheet(); return; }
      if (e.target.closest('#btnLoeschen')) { loeschen(); return; }
      if (e.target.closest('#btnExport')) { exportieren(); return; }
      if (e.target.closest('#btnImport')) { $('dateiImport').click(); return; }
      if (e.target.closest('#btnReset')) { allesLoeschen(); return; }
      if (e.target.closest('#btnInstall')) { installieren(); return; }
      if (e.target.closest('#btnCache')) { cacheLeeren(); return; }
    });

    document.addEventListener('change', function (e) {
      var f = e.target.closest('[data-formal]');
      if (f) {
        state.formalitaeten[f.dataset.formal] = { done: f.checked, datum: f.checked ? heute() : '' };
        speichern();
        render();
        return;
      }
      var pfad = e.target.closest('[data-pfad]');
      if (pfad) {
        uebernehmeFeld(pfad);
        if (pfad.dataset.pfad.indexOf('ui.') === 0 || pfad.dataset.pfad === 'klasse') render();
        return;
      }
      if (e.target.id === 'dateiImport' && e.target.files && e.target.files[0]) {
        importieren(e.target.files[0]);
        e.target.value = '';
      }
    });

    document.addEventListener('input', function (e) {
      var pfad = e.target.closest('[data-pfad]');
      if (pfad && pfad.type !== 'checkbox') uebernehmeFeld(pfad);
    });

    $('sheetSpeichern').addEventListener('click', sichern);
    $('sheetAbbrechen').addEventListener('click', schliesseSheet);
    $('sheetForm').addEventListener('submit', function (e) { e.preventDefault(); sichern(); });
    $('hinweisAktion').addEventListener('click', rueckgaengig);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !$('sheet').hidden) schliesseSheet();
    });

    window.addEventListener('scroll', function () {
      document.querySelector('.kopf').classList.toggle('ist-gescrollt', window.scrollY > 4);
    }, { passive: true });

    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var reagiere = function () { if (ui().design === 'system') anwendenUI(); };
      if (mq.addEventListener) mq.addEventListener('change', reagiere);
      else if (mq.addListener) mq.addListener(reagiere);
    }

    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      installEreignis = e;
      if ($('btnInstall')) pruefeInstallation();
    });
    window.addEventListener('appinstalled', function () {
      installEreignis = null;
      hinweis('App installiert');
    });
  }

  function uebernehmeFeld(el) {
    var pfad = el.dataset.pfad;
    var wert;
    if (el.type === 'checkbox') wert = el.checked;
    else if (el.type === 'number' || el.getAttribute('inputmode') === 'decimal') wert = Math.max(0, S.num(el.value));
    else wert = el.value;
    if (pfad === 'klasse') wert = el.value === 'B' ? 'B' : 'B197';
    setzeWert(pfad, wert);
  }

  function installieren() {
    if (!installEreignis) return;
    installEreignis.prompt();
    installEreignis.userChoice.then(function (w) {
      if (w && w.outcome === 'accepted') hinweis('App wird installiert');
      installEreignis = null;
      pruefeInstallation();
    });
  }

  function cacheLeeren() {
    var fertig = function () { location.reload(); };
    if (!('caches' in window)) return fertig();
    caches.keys().then(function (n) {
      return Promise.all(n.map(function (x) { return caches.delete(x); }));
    }).then(function () {
      if ('serviceWorker' in navigator) {
        return navigator.serviceWorker.getRegistrations().then(function (rs) {
          return Promise.all(rs.map(function (r) { return r.unregister(); }));
        });
      }
    }).then(fertig).catch(fertig);
  }

  /* ================= Service Worker ================= */

  function sw() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function (e) { console.warn('SW:', e); });
    });
    var neu = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (neu) return;
      neu = true;
      location.reload();
    });
  }

  /* ================= Start ================= */

  state = laden();
  nav.tab = ui().start || 'uebersicht';
  bindeEreignisse();
  render();
  sw();

  try {
    var wunsch = new URLSearchParams(location.search).get('neu');
    if (wunsch && FORMULAR[wunsch]) {
      oeffneForm(wunsch);
      history.replaceState(null, '', location.pathname);
    }
  } catch (e) { }
})();
