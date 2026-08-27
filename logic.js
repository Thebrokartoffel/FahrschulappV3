/* Schaltpunkt – Kernlogik. Bewusst ohne DOM-Zugriff, damit sie separat testbar ist. */
(function (global) {
  'use strict';

  var SP = {};

  SP.VERSION = 1;
  SP.STORAGE_KEY = 'schaltpunkt.v1';

  /* Gesetzliche Vorgaben, Stand der Recherche.
     Alle Werte sind in den Einstellungen überschreibbar. */
  SP.DEFAULT_SETTINGS = {
    name: '',
    fahrschule: 'Fahrschule Kirsch',
    klasse: 'B197',
    ziele: {
      ueberland: 5,        // § 5 FahrschAusbO
      autobahn: 4,
      nacht: 3,
      theorieGrund: 12,    // Doppelstunden à 90 min
      theorieZusatz: 2,
      schaltUE: 10,        // § 5a FahrschAusbO, B197
      testfahrtMin: 15
    },
    preise: {
      fahrstunde: 0,
      sonderfahrt: 0,
      pruefungTheorie: 0,
      pruefungPraxis: 0
    },
    geplanteUebungsstunden: 0,
    wochenziel: 0,
    standard: { ue: 2, preis: 0 },
    ui: {
      design: 'system',      /* system | hell | dunkel */
      akzent: 'amber',       /* amber | blau | gruen | terra | violett | graphit */
      schrift: 'normal',     /* klein | normal | gross */
      kompakt: false,
      animationen: true,
      start: 'uebersicht'
    }
  };

  SP.AKZENTE = [
    { id: 'amber', name: 'Bernstein', probe: '#F2B21B' },
    { id: 'blau', name: 'Signalblau', probe: '#2563EB' },
    { id: 'gruen', name: 'Tannengrün', probe: '#2F8F63' },
    { id: 'terra', name: 'Terrakotta', probe: '#C2603F' },
    { id: 'violett', name: 'Aubergine', probe: '#7C5CD6' },
    { id: 'graphit', name: 'Graphit', probe: '#3B424B' }
  ];

  SP.ARTEN = {
    grund: { label: 'Übungsfahrt', kurz: 'Übung' },
    ueberland: { label: 'Überlandfahrt', kurz: 'Überland' },
    autobahn: { label: 'Autobahnfahrt', kurz: 'Autobahn' },
    nacht: { label: 'Nachtfahrt', kurz: 'Nacht' },
    testfahrt: { label: 'Testfahrt Schaltkompetenz', kurz: 'Testfahrt' }
  };

  SP.KOSTEN_KATEGORIEN = {
    grundgebuehr: 'Anmelde-/Grundgebühr',
    sehtest: 'Sehtest',
    ersteHilfe: 'Erste-Hilfe-Kurs',
    material: 'Lernmaterial',
    behoerde: 'Behörde / Antrag',
    sonstiges: 'Sonstiges'
  };

  SP.FORMALITAETEN = [
    { key: 'sehtest', label: 'Sehtest' },
    { key: 'ersteHilfe', label: 'Erste-Hilfe-Kurs' },
    { key: 'passfoto', label: 'Passbild' },
    { key: 'antrag', label: 'Antrag bei der Führerscheinstelle' },
    { key: 'pruefauftrag', label: 'Prüfauftrag erteilt' },
    { key: 'bescheinigung197', label: 'Bescheinigung Schaltkompetenz (197)' }
  ];

  /* ---------- kleine Helfer ---------- */

  SP.uid = function () {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  };

  SP.todayISO = function (d) {
    var t = d ? new Date(d) : new Date();
    var m = String(t.getMonth() + 1).padStart(2, '0');
    var day = String(t.getDate()).padStart(2, '0');
    return t.getFullYear() + '-' + m + '-' + day;
  };

  SP.parseISO = function (iso) {
    if (!iso || typeof iso !== 'string') return null;
    var p = iso.split('-');
    if (p.length !== 3) return null;
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    return isNaN(d.getTime()) ? null : d;
  };

  SP.addDays = function (iso, n) {
    var d = SP.parseISO(iso);
    if (!d) return '';
    d.setDate(d.getDate() + n);
    return SP.todayISO(d);
  };

  SP.addMonths = function (iso, n) {
    var d = SP.parseISO(iso);
    if (!d) return '';
    var tag = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + n);
    var letzter = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(tag, letzter));
    return SP.todayISO(d);
  };

  SP.diffTage = function (vonISO, bisISO) {
    var a = SP.parseISO(vonISO), b = SP.parseISO(bisISO);
    if (!a || !b) return null;
    return Math.round((b - a) / 86400000);
  };

  SP.num = function (v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    if (typeof v !== 'string') return 0;
    var s = v.trim().replace(/\s|€/g, '').replace(',', '.');
    if (s === '') return 0;
    var n = parseFloat(s);
    return isFinite(n) ? n : 0;
  };

  SP.eur = function (n) {
    return SP.num(n).toLocaleString('de-DE', {
      style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  };

  SP.datum = function (iso, lang) {
    var d = SP.parseISO(iso);
    if (!d) return '–';
    return d.toLocaleDateString('de-DE', lang
      ? { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' }
      : { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  SP.ue = function (n) {
    var v = SP.num(n);
    return (Math.round(v * 100) / 100).toString().replace('.', ',');
  };

  SP.pct = function (ist, soll) {
    if (!soll || soll <= 0) return ist > 0 ? 100 : 0;
    return Math.max(0, Math.min(100, Math.round((ist / soll) * 100)));
  };

  /* ---------- State ---------- */

  SP.emptyState = function () {
    var s = JSON.parse(JSON.stringify(SP.DEFAULT_SETTINGS));
    var form = {};
    SP.FORMALITAETEN.forEach(function (f) { form[f.key] = { done: false, datum: '' }; });
    return {
      v: SP.VERSION,
      erstellt: SP.todayISO(),
      settings: s,
      fahrstunden: [],
      theorie: [],
      kosten: [],
      zahlungen: [],
      pruefungen: [],
      formalitaeten: form
    };
  };

  /* Nimmt beliebige (auch kaputte) Daten und macht daraus einen gültigen State. */
  SP.migrate = function (raw) {
    var leer = SP.emptyState();
    if (!raw || typeof raw !== 'object') return leer;

    var st = leer;
    st.erstellt = typeof raw.erstellt === 'string' ? raw.erstellt : leer.erstellt;

    if (raw.settings && typeof raw.settings === 'object') {
      var rs = raw.settings;
      if (typeof rs.name === 'string') st.settings.name = rs.name.slice(0, 40);
      if (typeof rs.fahrschule === 'string') st.settings.fahrschule = rs.fahrschule;
      if (typeof rs.klasse === 'string') st.settings.klasse = rs.klasse;
      if (rs.theme === 'dark' || rs.theme === 'light') st.settings.theme = rs.theme;
      st.settings.geplanteUebungsstunden = SP.num(rs.geplanteUebungsstunden);
      if (rs.ziele && typeof rs.ziele === 'object') {
        Object.keys(st.settings.ziele).forEach(function (k) {
          if (rs.ziele[k] !== undefined && rs.ziele[k] !== null && rs.ziele[k] !== '') {
            st.settings.ziele[k] = Math.max(0, SP.num(rs.ziele[k]));
          }
        });
      }
      st.settings.wochenziel = Math.max(0, SP.num(rs.wochenziel));
      if (rs.standard && typeof rs.standard === 'object') {
        st.settings.standard.ue = Math.max(0, SP.num(rs.standard.ue)) || 2;
        st.settings.standard.preis = Math.max(0, SP.num(rs.standard.preis));
      }
      if (rs.ui && typeof rs.ui === 'object') {
        var u = st.settings.ui;
        if (['system', 'hell', 'dunkel'].indexOf(rs.ui.design) >= 0) u.design = rs.ui.design;
        if (SP.AKZENTE.some(function (a) { return a.id === rs.ui.akzent; })) u.akzent = rs.ui.akzent;
        if (['klein', 'normal', 'gross'].indexOf(rs.ui.schrift) >= 0) u.schrift = rs.ui.schrift;
        u.kompakt = !!rs.ui.kompakt;
        u.animationen = rs.ui.animationen !== false;
        if (['uebersicht', 'ausbildung', 'kosten'].indexOf(rs.ui.start) >= 0) u.start = rs.ui.start;
      } else if (rs.theme === 'dark') {
        st.settings.ui.design = 'dunkel';   /* alte Version */
      }
      if (rs.preise && typeof rs.preise === 'object') {
        Object.keys(st.settings.preise).forEach(function (k) {
          st.settings.preise[k] = Math.max(0, SP.num(rs.preise[k]));
        });
      }
    }

    if (Array.isArray(raw.fahrstunden)) {
      st.fahrstunden = raw.fahrstunden.map(function (e) {
        e = e || {};
        var art = SP.ARTEN[e.art] ? e.art : 'grund';
        return {
          id: e.id || SP.uid(),
          datum: typeof e.datum === 'string' ? e.datum : '',
          art: art,
          getriebe: e.getriebe === 'schalt' || art === 'testfahrt' ? 'schalt' : 'automatik',
          ue: Math.max(0, SP.num(e.ue)) || 1,
          minuten: art === 'testfahrt' ? Math.max(0, SP.num(e.minuten)) : 0,
          kosten: Math.max(0, SP.num(e.kosten)),
          fahrlehrer: typeof e.fahrlehrer === 'string' ? e.fahrlehrer : '',
          bewertung: Math.max(0, Math.min(5, Math.round(SP.num(e.bewertung)))),
          notiz: typeof e.notiz === 'string' ? e.notiz : ''
        };
      }).filter(function (e) { return !!e.datum; });
    }

    if (Array.isArray(raw.theorie)) {
      st.theorie = raw.theorie.map(function (e) {
        e = e || {};
        return {
          id: e.id || SP.uid(),
          datum: typeof e.datum === 'string' ? e.datum : '',
          block: e.block === 'zusatz' ? 'zusatz' : 'grund',
          lektion: Math.max(1, Math.round(SP.num(e.lektion)) || 1),
          thema: typeof e.thema === 'string' ? e.thema : '',
          notiz: typeof e.notiz === 'string' ? e.notiz : ''
        };
      }).filter(function (e) { return !!e.datum; });
    }

    if (Array.isArray(raw.kosten)) {
      st.kosten = raw.kosten.map(function (e) {
        e = e || {};
        return {
          id: e.id || SP.uid(),
          datum: typeof e.datum === 'string' ? e.datum : '',
          bezeichnung: typeof e.bezeichnung === 'string' ? e.bezeichnung : 'Posten',
          betrag: Math.max(0, SP.num(e.betrag)),
          kategorie: SP.KOSTEN_KATEGORIEN[e.kategorie] ? e.kategorie : 'sonstiges'
        };
      }).filter(function (e) { return !!e.datum; });
    }

    if (Array.isArray(raw.zahlungen)) {
      st.zahlungen = raw.zahlungen.map(function (e) {
        e = e || {};
        return {
          id: e.id || SP.uid(),
          datum: typeof e.datum === 'string' ? e.datum : '',
          betrag: Math.max(0, SP.num(e.betrag)),
          art: typeof e.art === 'string' ? e.art : 'Überweisung',
          notiz: typeof e.notiz === 'string' ? e.notiz : ''
        };
      }).filter(function (e) { return !!e.datum; });
    }

    if (Array.isArray(raw.pruefungen)) {
      st.pruefungen = raw.pruefungen.map(function (e) {
        e = e || {};
        var status = ['geplant', 'bestanden', 'nichtBestanden'].indexOf(e.status) >= 0 ? e.status : 'geplant';
        return {
          id: e.id || SP.uid(),
          datum: typeof e.datum === 'string' ? e.datum : '',
          typ: e.typ === 'praxis' ? 'praxis' : 'theorie',
          status: status,
          kosten: Math.max(0, SP.num(e.kosten)),
          fehlerpunkte: e.fehlerpunkte === '' || e.fehlerpunkte === undefined || e.fehlerpunkte === null
            ? null : Math.max(0, SP.num(e.fehlerpunkte)),
          notiz: typeof e.notiz === 'string' ? e.notiz : ''
        };
      }).filter(function (e) { return !!e.datum; });
    }

    if (raw.formalitaeten && typeof raw.formalitaeten === 'object') {
      SP.FORMALITAETEN.forEach(function (f) {
        var q = raw.formalitaeten[f.key];
        if (q && typeof q === 'object') {
          st.formalitaeten[f.key] = {
            done: !!q.done,
            datum: typeof q.datum === 'string' ? q.datum : ''
          };
        }
      });
    }

    return st;
  };

  /* ---------- Auswertung ---------- */

  /* Termine in der Zukunft zählen noch nicht als absolviert. */
  SP.erledigt = function (eintrag, heute) {
    heute = heute || SP.todayISO();
    return !!eintrag.datum && eintrag.datum <= heute;
  };

  SP.sortiert = function (liste) {
    return liste.slice().sort(function (a, b) {
      if (a.datum === b.datum) return (a.id || '') < (b.id || '') ? -1 : 1;
      return a.datum < b.datum ? 1 : -1;
    });
  };

  SP.fahrstundenStats = function (state, heute) {
    heute = heute || SP.todayISO();
    var z = state.settings.ziele;
    var r = {
      ueberland: 0, autobahn: 0, nacht: 0, grund: 0,
      gesamtUE: 0, schaltUE: 0, automatikUE: 0,
      testfahrt: null, testfahrtOk: false,
      geplant: [], bewertungen: [],
      sonderIst: 0, sonderSoll: z.ueberland + z.autobahn + z.nacht
    };
    state.fahrstunden.forEach(function (e) {
      if (!SP.erledigt(e, heute)) { r.geplant.push(e); return; }
      r.gesamtUE += e.ue;
      if (e.getriebe === 'schalt' && e.art !== 'testfahrt') r.schaltUE += e.ue;
      else if (e.art !== 'testfahrt') r.automatikUE += e.ue;
      if (e.art === 'testfahrt') {
        if (!r.testfahrt || e.datum > r.testfahrt.datum) r.testfahrt = e;
        if (e.minuten >= z.testfahrtMin) r.testfahrtOk = true;
      } else if (r[e.art] !== undefined) {
        r[e.art] += e.ue;
      }
      if (e.bewertung > 0) r.bewertungen.push(e.bewertung);
    });
    r.sonderIst = Math.min(r.ueberland, z.ueberland) + Math.min(r.autobahn, z.autobahn) + Math.min(r.nacht, z.nacht);
    r.schnitt = r.bewertungen.length
      ? Math.round((r.bewertungen.reduce(function (a, b) { return a + b; }, 0) / r.bewertungen.length) * 10) / 10
      : null;
    r.restSonderUE = Math.max(0, z.ueberland - r.ueberland) + Math.max(0, z.autobahn - r.autobahn) + Math.max(0, z.nacht - r.nacht);
    r.restSchaltUE = Math.max(0, z.schaltUE - r.schaltUE);
    return r;
  };

  SP.theorieStats = function (state, heute) {
    heute = heute || SP.todayISO();
    var z = state.settings.ziele;
    var grund = {}, zusatz = {}, besuche = 0, geplant = [];
    state.theorie.forEach(function (e) {
      if (!SP.erledigt(e, heute)) { geplant.push(e); return; }
      besuche++;
      (e.block === 'zusatz' ? zusatz : grund)[e.lektion] = e;
    });
    var gk = Object.keys(grund).length, zk = Object.keys(zusatz).length;
    return {
      grundMap: grund, zusatzMap: zusatz,
      grundIst: gk, zusatzIst: zk,
      grundSoll: z.theorieGrund, zusatzSoll: z.theorieZusatz,
      ist: Math.min(gk, z.theorieGrund) + Math.min(zk, z.theorieZusatz),
      soll: z.theorieGrund + z.theorieZusatz,
      besuche: besuche, geplant: geplant
    };
  };

  SP.pruefungenNach = function (state, typ) {
    return state.pruefungen
      .filter(function (p) { return p.typ === typ; })
      .sort(function (a, b) { return a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0; })
      .map(function (p, i) { p = Object.assign({}, p); p.versuch = i + 1; return p; });
  };

  SP.bestanden = function (state, typ) {
    var liste = SP.pruefungenNach(state, typ).filter(function (p) { return p.status === 'bestanden'; });
    return liste.length ? liste[0] : null;
  };

  SP.kostenStats = function (state, heute) {
    heute = heute || SP.todayISO();
    var f = 0, fGeplant = 0, p = 0, pGeplant = 0, posten = 0, bezahlt = 0;
    var nachKategorie = {};

    state.fahrstunden.forEach(function (e) {
      if (SP.erledigt(e, heute)) { f += e.kosten; } else { fGeplant += e.kosten; }
    });
    state.pruefungen.forEach(function (e) {
      if (SP.erledigt(e, heute)) { p += e.kosten; } else { pGeplant += e.kosten; }
    });
    state.kosten.forEach(function (e) {
      if (SP.erledigt(e, heute)) {
        posten += e.betrag;
        nachKategorie[e.kategorie] = (nachKategorie[e.kategorie] || 0) + e.betrag;
      }
    });
    state.zahlungen.forEach(function (e) { if (SP.erledigt(e, heute)) bezahlt += e.betrag; });

    var gesamt = f + p + posten;
    return {
      fahrstunden: f, pruefungen: p, posten: posten,
      geplant: fGeplant + pGeplant,
      nachKategorie: nachKategorie,
      gesamt: gesamt, bezahlt: bezahlt, offen: Math.round((gesamt - bezahlt) * 100) / 100
    };
  };

  /* Durchschnittspreis aus den vorhandenen Einträgen, sonst Einstellungswert. */
  SP.preisModell = function (state, heute) {
    heute = heute || SP.todayISO();
    var pr = state.settings.preise;
    var sumStd = 0, ueStd = 0, sumSond = 0, ueSond = 0;
    state.fahrstunden.forEach(function (e) {
      if (!SP.erledigt(e, heute) || e.kosten <= 0 || e.ue <= 0) return;
      if (e.art === 'ueberland' || e.art === 'autobahn' || e.art === 'nacht') {
        sumSond += e.kosten; ueSond += e.ue;
      } else {
        sumStd += e.kosten; ueStd += e.ue;
      }
    });
    var std = pr.fahrstunde > 0 ? pr.fahrstunde : (ueStd > 0 ? sumStd / ueStd : 0);
    var sond = pr.sonderfahrt > 0 ? pr.sonderfahrt : (ueSond > 0 ? sumSond / ueSond : std);
    return {
      fahrstunde: Math.round(std * 100) / 100,
      sonderfahrt: Math.round(sond * 100) / 100,
      quelle: (pr.fahrstunde > 0 || pr.sonderfahrt > 0) ? 'einstellungen' : (ueStd + ueSond > 0 ? 'schnitt' : 'keine')
    };
  };

  SP.prognose = function (state, heute) {
    heute = heute || SP.todayISO();
    var k = SP.kostenStats(state, heute);
    var f = SP.fahrstundenStats(state, heute);
    var pm = SP.preisModell(state, heute);
    var pr = state.settings.preise;
    var posten = [];

    if (k.geplant > 0) posten.push({ label: 'Bereits eingetragene Termine', betrag: k.geplant });

    var restSonder = f.restSonderUE * pm.sonderfahrt;
    if (f.restSonderUE > 0 && pm.sonderfahrt > 0) {
      posten.push({ label: 'Offene Sonderfahrten (' + SP.ue(f.restSonderUE) + ' UE)', betrag: restSonder });
    }
    var restSchalt = f.restSchaltUE * pm.fahrstunde;
    if (f.restSchaltUE > 0 && pm.fahrstunde > 0) {
      posten.push({ label: 'Offene Schaltstunden (' + SP.ue(f.restSchaltUE) + ' UE)', betrag: restSchalt });
    }
    var uebung = SP.num(state.settings.geplanteUebungsstunden) * pm.fahrstunde;
    if (uebung > 0) {
      posten.push({ label: 'Geplante Übungsstunden (' + SP.ue(state.settings.geplanteUebungsstunden) + ' UE)', betrag: uebung });
    }
    if (!SP.bestanden(state, 'theorie') && pr.pruefungTheorie > 0) {
      posten.push({ label: 'Theorieprüfung', betrag: pr.pruefungTheorie });
    }
    if (!SP.bestanden(state, 'praxis') && pr.pruefungPraxis > 0) {
      posten.push({ label: 'Praktische Prüfung', betrag: pr.pruefungPraxis });
    }

    var offenNoch = posten.reduce(function (a, b) { return a + b.betrag; }, 0);
    return {
      basis: k.gesamt,
      posten: posten,
      rest: Math.round(offenNoch * 100) / 100,
      gesamt: Math.round((k.gesamt + offenNoch) * 100) / 100,
      belastbar: pm.quelle !== 'keine'
    };
  };

  /* Prüfungsreife: was fehlt noch zur Zulassung zur praktischen Prüfung? */
  SP.pruefungsreife = function (state, heute) {
    heute = heute || SP.todayISO();
    var f = SP.fahrstundenStats(state, heute);
    var t = SP.theorieStats(state, heute);
    var z = state.settings.ziele;
    var theoriePr = SP.bestanden(state, 'theorie');
    var items = [
      {
        key: 'theorieUnterricht', label: 'Theorieunterricht',
        ist: t.ist, soll: t.soll,
        detail: t.grundIst + '/' + t.grundSoll + ' Grundstoff · ' + t.zusatzIst + '/' + t.zusatzSoll + ' Zusatzstoff',
        ok: t.ist >= t.soll
      },
      {
        key: 'theoriePruefung', label: 'Theorieprüfung',
        ist: theoriePr ? 1 : 0, soll: 1,
        detail: theoriePr ? 'bestanden am ' + SP.datum(theoriePr.datum) : 'noch offen',
        ok: !!theoriePr
      },
      {
        key: 'ueberland', label: 'Überlandfahrten',
        ist: Math.min(f.ueberland, z.ueberland), soll: z.ueberland,
        detail: SP.ue(f.ueberland) + ' von ' + z.ueberland + ' UE', ok: f.ueberland >= z.ueberland
      },
      {
        key: 'autobahn', label: 'Autobahnfahrten',
        ist: Math.min(f.autobahn, z.autobahn), soll: z.autobahn,
        detail: SP.ue(f.autobahn) + ' von ' + z.autobahn + ' UE', ok: f.autobahn >= z.autobahn
      },
      {
        key: 'nacht', label: 'Nachtfahrten',
        ist: Math.min(f.nacht, z.nacht), soll: z.nacht,
        detail: SP.ue(f.nacht) + ' von ' + z.nacht + ' UE', ok: f.nacht >= z.nacht
      }
    ];

    if (state.settings.klasse === 'B197') {
      items.push({
        key: 'schalt', label: 'Schaltstunden',
        ist: Math.min(f.schaltUE, z.schaltUE), soll: z.schaltUE,
        detail: SP.ue(f.schaltUE) + ' von ' + z.schaltUE + ' UE auf Schaltwagen', ok: f.schaltUE >= z.schaltUE
      });
      items.push({
        key: 'testfahrt', label: 'Testfahrt Schaltkompetenz',
        ist: f.testfahrtOk ? 1 : 0, soll: 1,
        detail: f.testfahrt
          ? (f.testfahrtOk ? SP.num(f.testfahrt.minuten) + ' min am ' + SP.datum(f.testfahrt.datum)
            : 'nur ' + SP.num(f.testfahrt.minuten) + ' min – mindestens ' + z.testfahrtMin + ' min nötig')
          : 'mindestens ' + z.testfahrtMin + ' min, nach den Schaltstunden',
        ok: f.testfahrtOk
      });
    }

    var offen = items.filter(function (i) { return !i.ok; });
    var summeIst = items.reduce(function (a, i) { return a + Math.min(i.ist, i.soll); }, 0);
    var summeSoll = items.reduce(function (a, i) { return a + i.soll; }, 0);
    var prozent = SP.pct(summeIst, summeSoll);
    var ampel = offen.length === 0 ? 'gruen' : (prozent >= 60 ? 'gelb' : 'rot');

    return { items: items, offen: offen, prozent: prozent, ampel: ampel };
  };

  /* Stationen für die Fortschritts-Straße auf der Übersicht */
  SP.stationen = function (state, heute) {
    heute = heute || SP.todayISO();
    var f = SP.fahrstundenStats(state, heute);
    var t = SP.theorieStats(state, heute);
    var z = state.settings.ziele;
    var form = state.formalitaeten;
    var formPflicht = ['sehtest', 'ersteHilfe', 'antrag'];
    var formIst = formPflicht.filter(function (k) { return form[k] && form[k].done; }).length;
    var theoriePr = SP.bestanden(state, 'theorie');
    var praxisPr = SP.bestanden(state, 'praxis');

    var st = [
      { key: 'formalitaeten', label: 'Anmeldung & Formalitäten', ist: formIst, soll: formPflicht.length, einheit: '' },
      { key: 'theorie', label: 'Theorieunterricht', ist: t.ist, soll: t.soll, einheit: 'DS' },
      { key: 'theoriePruefung', label: 'Theorieprüfung', ist: theoriePr ? 1 : 0, soll: 1, einheit: '' },
      { key: 'sonder', label: 'Sonderfahrten', ist: f.sonderIst, soll: f.sonderSoll, einheit: 'UE' }
    ];
    if (state.settings.klasse === 'B197') {
      st.push({
        key: 'schalt', label: 'Schaltkompetenz',
        ist: Math.min(f.schaltUE, z.schaltUE) + (f.testfahrtOk ? 1 : 0),
        soll: z.schaltUE + 1, einheit: 'UE'
      });
    }
    st.push({ key: 'praxis', label: 'Praktische Prüfung', ist: praxisPr ? 1 : 0, soll: 1, einheit: '' });

    st.forEach(function (s) { s.prozent = SP.pct(s.ist, s.soll); });
    var gesamt = Math.round(st.reduce(function (a, s) { return a + s.prozent; }, 0) / st.length);
    return { stationen: st, gesamt: gesamt };
  };

  /* Fristen nach § 18 FeV */
  SP.fristen = function (state, heute) {
    heute = heute || SP.todayISO();
    var out = [];
    var theoriePr = SP.bestanden(state, 'theorie');
    var praxisPr = SP.bestanden(state, 'praxis');

    if (theoriePr && !praxisPr) {
      var ende = SP.addMonths(theoriePr.datum, 12);
      var rest = SP.diffTage(heute, ende);
      out.push({
        key: 'theorieGueltig',
        titel: 'Praktische Prüfung bis ' + SP.datum(ende),
        text: 'Die bestandene Theorieprüfung verfällt 12 Monate nach dem Prüfungstag (§ 18 Abs. 2 FeV).',
        datum: ende, tage: rest,
        level: rest < 0 ? 'rot' : rest < 60 ? 'gelb' : 'gruen'
      });
    }

    var durchgefallen = state.pruefungen
      .filter(function (p) { return p.status === 'nichtBestanden' && SP.erledigt(p, heute); })
      .sort(function (a, b) { return a.datum < b.datum ? 1 : -1; })[0];
    if (durchgefallen) {
      var frueh = SP.addDays(durchgefallen.datum, 14);
      if (frueh > heute) {
        out.push({
          key: 'sperrfrist',
          titel: 'Wiederholung ab ' + SP.datum(frueh),
          text: 'Eine nicht bestandene Prüfung darf in der Regel erst nach zwei Wochen wiederholt werden (§ 18 Abs. 1 FeV).',
          datum: frueh, tage: SP.diffTage(heute, frueh), level: 'gelb'
        });
      }
    }

    if (praxisPr) {
      var abhol = SP.addMonths(praxisPr.datum, 24);
      out.push({
        key: 'aushaendigung',
        titel: 'Führerschein abholen bis ' + SP.datum(abhol),
        text: 'Zwischen bestandener Prüfung und Aushändigung dürfen höchstens zwei Jahre liegen (§ 18 Abs. 2 FeV).',
        datum: abhol, tage: SP.diffTage(heute, abhol), level: 'gruen'
      });
    }
    return out;
  };

  /* Kommende Termine (Fahrstunden, Theorie, Prüfungen in der Zukunft) */
  SP.termine = function (state, heute) {
    heute = heute || SP.todayISO();
    var out = [];
    state.fahrstunden.forEach(function (e) {
      if (e.datum > heute) out.push({ datum: e.datum, typ: 'fahrstunde', label: SP.ARTEN[e.art].label, id: e.id });
    });
    state.theorie.forEach(function (e) {
      if (e.datum > heute) out.push({
        datum: e.datum, typ: 'theorie',
        label: 'Theorie ' + (e.block === 'zusatz' ? 'Zusatzstoff ' : 'Grundstoff ') + e.lektion, id: e.id
      });
    });
    state.pruefungen.forEach(function (e) {
      if (e.datum > heute) out.push({
        datum: e.datum, typ: 'pruefung',
        label: (e.typ === 'praxis' ? 'Praktische' : 'Theoretische') + ' Prüfung', id: e.id
      });
    });
    out.sort(function (a, b) { return a.datum < b.datum ? -1 : 1; });
    out.forEach(function (t) { t.tage = SP.diffTage(heute, t.datum); });
    return out;
  };

  /* Tempo: Fahrstunden pro Woche und Hochrechnung, wann die Pflichtstunden stehen */
  SP.tempo = function (state, heute) {
    heute = heute || SP.todayISO();
    var erledigte = state.fahrstunden.filter(function (e) { return SP.erledigt(e, heute); });
    if (erledigte.length < 2) return { proWoche: null, restUE: null, prognose: null, wochen: [] };

    var daten = erledigte.map(function (e) { return e.datum; }).sort();
    var erste = daten[0];
    var spanne = Math.max(7, SP.diffTage(erste, heute));
    var ue = erledigte.reduce(function (a, e) { return a + e.ue; }, 0);
    var proWoche = Math.round((ue / spanne) * 7 * 10) / 10;

    var f = SP.fahrstundenStats(state, heute);
    var restUE = f.restSonderUE + f.restSchaltUE + SP.num(state.settings.geplanteUebungsstunden);
    var prognose = null;
    if (proWoche > 0 && restUE > 0) {
      prognose = SP.addDays(heute, Math.ceil((restUE / proWoche) * 7));
    } else if (restUE <= 0) {
      prognose = heute;
    }

    /* letzte 8 Wochen als Balken */
    var wochen = [];
    for (var i = 7; i >= 0; i--) {
      var bis = SP.addDays(heute, -7 * i);
      var von = SP.addDays(bis, -6);
      var summe = 0;
      erledigte.forEach(function (e) { if (e.datum >= von && e.datum <= bis) summe += e.ue; });
      wochen.push({ von: von, bis: bis, ue: Math.round(summe * 10) / 10 });
    }
    return { proWoche: proWoche, restUE: restUE, prognose: prognose, wochen: wochen };
  };

  /* Die sieben Tage der laufenden Woche mit Aktivität, für den Wochenstreifen */
  SP.wochentage = function (state, heute) {
    heute = heute || SP.todayISO();
    var d = SP.parseISO(heute);
    var montag = new Date(d);
    montag.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    var start = SP.todayISO(montag);
    var namen = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    var out = [];
    for (var i = 0; i < 7; i++) {
      var iso = SP.addDays(start, i);
      var ue = 0, th = 0, pr = 0;
      state.fahrstunden.forEach(function (e) { if (e.datum === iso) ue += e.ue; });
      state.theorie.forEach(function (e) { if (e.datum === iso) th++; });
      state.pruefungen.forEach(function (e) { if (e.datum === iso) pr++; });
      out.push({
        datum: iso, tag: namen[i], nummer: Number(iso.slice(8, 10)),
        ue: Math.round(ue * 10) / 10, theorie: th, pruefung: pr,
        heute: iso === heute, zukunft: iso > heute
      });
    }
    return out;
  };

  /* Fortschritt der laufenden Woche (Montag bis Sonntag) */
  SP.woche = function (state, heute) {
    heute = heute || SP.todayISO();
    var d = SP.parseISO(heute);
    var montag = new Date(d);
    montag.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    var von = SP.todayISO(montag);
    var bis = SP.addDays(von, 6);
    var ue = 0, anzahl = 0;
    state.fahrstunden.forEach(function (e) {
      if (e.datum >= von && e.datum <= heute) { ue += e.ue; anzahl++; }
    });
    return {
      von: von, bis: bis, ue: Math.round(ue * 10) / 10, anzahl: anzahl,
      ziel: SP.num(state.settings.wochenziel),
      prozent: SP.pct(ue, SP.num(state.settings.wochenziel))
    };
  };

  /* Meilensteine */
  SP.badges = function (state, heute) {
    heute = heute || SP.todayISO();
    var f = SP.fahrstundenStats(state, heute);
    var t = SP.theorieStats(state, heute);
    var k = SP.kostenStats(state, heute);
    var z = state.settings.ziele;
    var theoriePr = SP.bestanden(state, 'theorie');
    var praxisPr = SP.bestanden(state, 'praxis');

    var erledigte = state.fahrstunden.filter(function (e) { return SP.erledigt(e, heute); });
    var wochenSet = {};
    erledigte.forEach(function (e) {
      var d = SP.parseISO(e.datum);
      if (!d) return;
      var montag = new Date(d);
      montag.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      wochenSet[SP.todayISO(montag)] = true;
    });
    var wochen = Object.keys(wochenSet).sort();
    var serie = 0, best = 0;
    for (var i = 0; i < wochen.length; i++) {
      if (i > 0 && SP.diffTage(wochen[i - 1], wochen[i]) === 7) serie++; else serie = 1;
      if (serie > best) best = serie;
    }

    var defs = [
      { id: 'start', label: 'Zündung', desc: 'Erste Fahrstunde eingetragen', ok: erledigte.length >= 1 },
      { id: 'theorie1', label: 'Grundstoff', desc: '5 Theoriestunden besucht', ok: t.besuche >= 5 },
      { id: 'theorieVoll', label: 'Theorie komplett', desc: 'Alle Pflicht-Doppelstunden besucht', ok: t.ist >= t.soll },
      { id: 'theoriePr', label: 'Theorie bestanden', desc: 'Theorieprüfung geschafft', ok: !!theoriePr },
      { id: 'zehn', label: 'Zweistellig', desc: '10 Fahrstunden absolviert', ok: f.gesamtUE >= 10 },
      { id: 'ueberland', label: 'Landstraße', desc: 'Alle Überlandfahrten', ok: f.ueberland >= z.ueberland },
      { id: 'autobahn', label: 'Linke Spur', desc: 'Alle Autobahnfahrten', ok: f.autobahn >= z.autobahn },
      { id: 'nacht', label: 'Fernlicht', desc: 'Alle Nachtfahrten', ok: f.nacht >= z.nacht },
      { id: 'sonder', label: 'Pflicht erfüllt', desc: 'Alle Sonderfahrten komplett', ok: f.sonderIst >= f.sonderSoll },
      { id: 'schalt', label: 'Schaltwagen', desc: z.schaltUE + ' Stunden auf Schaltgetriebe', ok: f.schaltUE >= z.schaltUE },
      { id: 'testfahrt', label: 'Schaltkompetenz', desc: 'Testfahrt bestanden', ok: f.testfahrtOk },
      { id: 'serie', label: 'Am Ball', desc: '3 Wochen in Folge gefahren', ok: best >= 3 },
      { id: 'bezahlt', label: 'Nichts offen', desc: 'Alle Kosten bezahlt', ok: k.gesamt > 0 && k.offen <= 0 },
      { id: 'praxis', label: 'Führerschein', desc: 'Praktische Prüfung bestanden', ok: !!praxisPr }
    ];
    return defs;
  };

  /* ---------- Validierung ---------- */

  SP.validiere = function (typ, d) {
    var fehler = {};
    var pflichtDatum = function () {
      if (!d.datum || !SP.parseISO(d.datum)) fehler.datum = 'Datum fehlt';
    };
    if (typ === 'fahrstunde') {
      pflichtDatum();
      if (!SP.ARTEN[d.art]) fehler.art = 'Art wählen';
      if (SP.num(d.ue) <= 0) fehler.ue = 'Mindestens 0,5 UE';
      if (SP.num(d.ue) > 24) fehler.ue = 'Das sind zu viele Einheiten';
      if (SP.num(d.kosten) < 0) fehler.kosten = 'Kein negativer Betrag';
      if (d.art === 'testfahrt' && SP.num(d.minuten) <= 0) fehler.minuten = 'Dauer in Minuten angeben';
    } else if (typ === 'theorie') {
      pflichtDatum();
      var l = SP.num(d.lektion);
      if (l < 1 || l > 20) fehler.lektion = 'Lektion 1 bis 20';
    } else if (typ === 'kosten') {
      pflichtDatum();
      if (!d.bezeichnung || !String(d.bezeichnung).trim()) fehler.bezeichnung = 'Bezeichnung fehlt';
      if (SP.num(d.betrag) <= 0) fehler.betrag = 'Betrag größer 0';
    } else if (typ === 'zahlung') {
      pflichtDatum();
      if (SP.num(d.betrag) <= 0) fehler.betrag = 'Betrag größer 0';
    } else if (typ === 'pruefung') {
      pflichtDatum();
      if (d.typ !== 'theorie' && d.typ !== 'praxis') fehler.typ = 'Art wählen';
      if (SP.num(d.kosten) < 0) fehler.kosten = 'Kein negativer Betrag';
      if (d.fehlerpunkte !== '' && d.fehlerpunkte !== null && d.fehlerpunkte !== undefined && SP.num(d.fehlerpunkte) < 0) {
        fehler.fehlerpunkte = 'Keine negativen Punkte';
      }
    }
    return { ok: Object.keys(fehler).length === 0, fehler: fehler };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = SP;
  global.SP = SP;
})(typeof window !== 'undefined' ? window : globalThis);
