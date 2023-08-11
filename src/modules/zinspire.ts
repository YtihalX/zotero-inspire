import ZoteroToolkit from "zotero-plugin-toolkit";
import { config } from "../../package.json"
import { getString } from "../utils/locale";
import { getPref } from "../utils/prefs";
export class ZInsprefs {
  static registerPrefs() {
    const prefOptions = {
      pluginID: config.addonID,
      src: rootURI + "chrome/content/preferences.xhtml",
      image: `chrome://${config.addonRef}/content/icons/favicon.png`,
      defaultXUL: true,
    };
    ztoolkit.PreferencePane.register(prefOptions);
  }

  static registerNotifier() {
    const callback = {
      notify: async (
        event: string,
        type: string,
        ids: number[] | string[],
        extraData: { [key: string]: any },
      ) => {
        if (!addon?.data.alive) {
          this.unregisterNotifier(notifierID);
          return;
        }
        addon.hooks.onNotify(event, type, ids, extraData);
      },
    };

    const notifierID = Zotero.Notifier.registerObserver(callback, ["item",]);

    window.addEventListener(
      "unload",
      (e: Event) => {
        this.unregisterNotifier(notifierID);
      },
      false,
    );
  }

  private static unregisterNotifier(notifierID: string) {
    Zotero.Notifier.unregisterObserver(notifierID);
  }
}

export class ZInsMenu {
  static registerRightClickMenuPopup() {
    const menuIcon = `chrome://${config.addonRef}/content/icons/favicon@0.5x.png`;
    ztoolkit.Menu.register("item",
      {
        tag: "menu",
        label: getString("menupopup-label"),
        children: [
          {
            tag: "menuitem",
            label: getString("menuitem-submenulabel0"),
            commandListener: (ev) => alert("hello?"),
          },
          {
            tag: "menuitem",
            label: getString("menuitem-submenulabel1"),
            commandListener: (ev) => alert("hello?"),
          },
          {
            tag: "menuitem",
            label: getString("menuitem-submenulabel2"),
            commandListener: (ev) => alert("hello?"),
          },
        ],
        icon: menuIcon,
      },
      // "before",
      // document.querySelector(
      //   "#zotero-itemmenu-addontemplate-test",
      // ) as XUL.MenuItem,
    );
    // ztoolkit.Menu.register("menuFile", {
    //   tag: "menuseparator",
    // });
  }
}

type jsobject = {
  [key: string]: any;
};
export class ZInspire {
  current: number;
  toUpdate: number;
  itemsToUpdate: Zotero.Item[] | null;
  numberOfUpdatedItems: number;
  counter: number;
  error_norecid: boolean | null;
  error_norecid_shown: boolean;
  final_count_shown: boolean;
  constructor(current: number = -1, toUpdate: number = 0, itemsToUpdate: Zotero.Item[] | null = null, numberOfUpdatedItems: number = 0, counter: number = 0, error_norecid: boolean | null = null, error_norecid_shown: boolean = false, final_count_shown: boolean = false) {
    this.current = current
    this.toUpdate = toUpdate
    this.itemsToUpdate = itemsToUpdate
    this.numberOfUpdatedItems = numberOfUpdatedItems
    this.counter = counter
    this.error_norecid = error_norecid
    this.error_norecid_shown = error_norecid_shown
    this.final_count_shown = final_count_shown
  }

  resetState(operation: string) {
    if (operation === "initial") {
        if (Zotero.Inspire.progressWindow) {
            Zotero.Inspire.progressWindow.close();
        }
        this.current = -1;
        this.toUpdate = 0;
        this.itemsToUpdate = null;
        this.numberOfUpdatedItems = 0;
        this.counter = 0;
        this.error_norecid = null;
        this.error_norecid_shown = false;
        this.final_count_shown = false;
        return;
    } else {
        if (this.error_norecid) {
            Zotero.Inspire.progressWindow.close();
            const icon = "chrome://zotero/skin/cross.png";
            if (this.error_norecid && !this.error_norecid_shown) {
                let progressWindowNoRecid = new Zotero.ProgressWindow({
                    closeOnClick: true
                });
                progressWindowNoRecid.changeHeadline("INSPIRE recid not found");
                if (Zotero.Inspire.getPref("tag_norecid") !== "") {
                    progressWindowNoRecid.progress = new progressWindowNoRecid.ItemProgress(icon, "No INSPIRE recid was found for some items. These have been tagged with '" + Zotero.Inspire.getPref("tag_norecid") + "'.");
                } else {
                    progressWindowNoRecid.progress = new progressWindowNoRecid.ItemProgress(icon, "No INSPIRE recid was found for some items.");
                }
                progressWindowNoRecid.progress.setError();
                progressWindowNoRecid.show();
                progressWindowNoRecid.startCloseTimer(8000);
                error_norecid_shown = true;
            }
        } else {
            if (!final_count_shown) {
                const icon = "chrome://zotero/skin/tick.png";
                Zotero.Inspire.progressWindow = new Zotero.ProgressWindow({
                    closeOnClick: true
                });
                Zotero.Inspire.progressWindow.changeHeadline("Finished");
                Zotero.Inspire.progressWindow.progress = new Zotero.Inspire.progressWindow.ItemProgress(icon);
                Zotero.Inspire.progressWindow.progress.setProgress(100);
                if (operation === "full" || operation === "noabstract") {
                    Zotero.Inspire.progressWindow.progress.setText(
                        "INSPIRE metadata updated for " +
                        Zotero.Inspire.counter + " items.");
                }
                if (operation === "citations") {
                    Zotero.Inspire.progressWindow.progress.setText(
                        "INSPIRE citation counts updated for " +
                        Zotero.Inspire.counter + " items.");
                }
                Zotero.Inspire.progressWindow.show();
                Zotero.Inspire.progressWindow.startCloseTimer(4000);
                final_count_shown = true;
            }
        }
        return;
    }
}
  updateItems(items0: Zotero.Item[], operation: string) {


    // don't update note items
    const items = items0.filter(item => item.isRegularItem());

    if (items.length === 0 ||
      this.numberOfUpdatedItems <
      this.toUpdate) {
      return;
    }

    Zotero.Inspire.resetState("initial");
    this.toUpdate = items.length;
    this.itemsToUpdate = items;

    // Progress Windows
    Zotero.Inspire.progressWindow =
      new Zotero.ProgressWindow({
        closeOnClick: false
      });
    const icon = 'chrome://zotero/skin/toolbar-advanced-search' +
      (Zotero.hiDPI ? "@2x" : "") + '.png';
    if (operation === "full" || operation === "noabstract") {
      Zotero.Inspire.progressWindow.changeHeadline(
        "Getting INSPIRE metadata", icon);
    }
    if (operation === "citations") {
      Zotero.Inspire.progressWindow.changeHeadline(
        "Getting INSPIRE citation counts", icon);
    }
    const inspireIcon =
      'chrome://zoteroinspire/skin/inspire' +
      (Zotero.hiDPI ? "@2x" : "") + '.png';
    Zotero.Inspire.progressWindow.progress =
      new Zotero.Inspire.progressWindow.ItemProgress(
        inspireIcon, "Retrieving INSPIRE metadata.");
    Zotero.Inspire.updateNextItem(operation);
  }
}

async function getInspireMeta(operation: any) {
  let item = ZoteroPane.getSelectedItems()[0];

  let metaInspire: jsobject = {};

  const doi0 = item.getField('DOI');
  let doi = doi0 as string;
  const url = item.getField('url') as string;
  let extra = item.getField('extra') as string;
  let searchOrNot = 0;

  let idtype = 'doi';
  var arxivReg = new RegExp(/arxiv/i)
  if (!doi || arxivReg.test(doi)) {

    if (extra.includes('arXiv:') || extra.includes('_eprint:')) { // arXiv number from Extra
      idtype = 'arxiv';
      const regexArxivId = /(arXiv:|_eprint:)(.+)/ //'arXiv:(.+)'
      /* in this way, different situations are included:
      New and old types of arXiv number; 
      whether or not the arXiv line is at the end of extra
      */
      if (extra.match(regexArxivId)) {
        let arxiv_split = (extra.match(regexArxivId) || " ")[2].split(' ')
        arxiv_split[0] === '' ? doi = arxiv_split[1] : doi = arxiv_split[0]
      }
    } else if (/(doi|arxiv|\/literature\/)/i.test(url)) {
      // patt taken from the Citations Count plugin
      const patt = /(?:arxiv.org[/]abs[/]|arXiv:)([a-z.-]+[/]\d+|\d+[.]\d+)/i;
      const m = patt.exec(url);
      if (!m) { // DOI from url
        if (/doi/i.test(url)) {
          doi = url.replace(/^.+doi.org\//, '')
        } else if (url.includes('/literature/')) {
          let _recid = /[^/]*$/.exec(url) || " "
          if (_recid[0].match(/^\d+/)) {
            idtype = 'literature';
            doi = _recid[0]
          }
        }
      } else { // arxiv number from from url
        idtype = 'arxiv';
        doi = m[1];
      }
    } else if (/DOI:/i.test(extra)) { // DOI in extra
      const regexDOIinExtra = /DOI:(.+)/i
      doi = (extra.match(regexDOIinExtra) || " ")[1].trim()
    } else if (/doi\.org\//i.test(extra)) {
      const regexDOIinExtra = /doi\.org\/(.+)/i
      doi = (extra.match(regexDOIinExtra) || " ")[1]
    } else { // INSPIRE recid in archiveLocation or Citation Key in Extra
      let _recid = item.getField('archiveLocation') as string;
      if (_recid.match(/^\d+/)) {
        idtype = 'literature';
        doi = _recid
      }
    }
  } else if (/doi/i.test(doi)) { //doi.includes("doi")
    doi = doi.replace(/^.+doi.org\//, '') //doi.replace('https://doi.org/', '')
  }

  if (!doi && extra.includes('Citation Key:')) searchOrNot = 1

  const t0 = performance.now();

  let urlInspire = "";
  if (searchOrNot === 0) {
    const edoi = encodeURIComponent(doi);
    urlInspire = "https://inspirehep.net/api/" + idtype + "/" + edoi;
  } else if (searchOrNot === 1) {
    const citekey = (extra.match(/^.*Citation\sKey:.*$/mg) || " ")[0].split(': ')[1]
    urlInspire = "https://inspirehep.net/api/literature?q=texkey%20" + encodeURIComponent(citekey);
  }

  if (!urlInspire) return -1;
  // Zotero.debug("urlInspire: ");
  // Zotero.debug(urlInspire)

  let status = null;
  const response = await fetch(urlInspire)
    //   .then(response => response.json())
    .then(response => {
      if (response.status !== 404) {
        status = 1;
        return response.json()
      }
    })
    .catch(err => null);

  // Zotero.debug('getInspireMeta response: ', response, 'status: ', status)
  if (status === null) {
    return -1;
  }

  const t1 = performance.now();
  Zotero.debug(`Fetching INSPIRE meta took ${t1 - t0} milliseconds.`)

  try {
    const meta = (() => {
      if (searchOrNot === 0) {
        return response['metadata']
      } else {
        const hits = response['hits'].hits
        if (hits.length === 1) return hits[0].metadata
      }
    })()


    metaInspire.recid = meta['control_number']

    metaInspire.citation_count = meta['citation_count']
    metaInspire.citation_count_wo_self_citations = meta['citation_count_without_self_citations']

    if (operation !== 'citation') {

      // get only the first doi
      if (meta['dois']) {
        metaInspire.DOI = meta['dois'][0].value
      }

      const publication_info = meta['publication_info']
      if (publication_info) {
        let pubinfo_first = publication_info[0]
        if (pubinfo_first.journal_title) {
          let jAbbrev = ""
          jAbbrev = pubinfo_first.journal_title;
          metaInspire.journalAbbreviation = jAbbrev.replace(/\.\s|\./g, ". ");
          pubinfo_first.journal_volume && (metaInspire.volume = pubinfo_first.journal_volume);
          if (pubinfo_first.artid) {
            metaInspire.pages = pubinfo_first.artid;
          } else if (pubinfo_first.page_start) {
            metaInspire.pages = pubinfo_first.page_start
            pubinfo_first.page_end && (metaInspire.pages = metaInspire.pages + "-" + pubinfo_first.page_end)
          }
          metaInspire.date = pubinfo_first.year;
          metaInspire.issue = pubinfo_first.journal_issue
        };
      }

      const metaArxiv = meta['arxiv_eprints']

      if (metaArxiv) {
        metaInspire.arxiv = metaArxiv[0]
        metaInspire.urlArxiv = 'https://arxiv.org/abs/' + metaInspire.arxiv.value
      }

      const metaAbstract = meta['abstracts']

      if (metaAbstract) {
        let abstractInspire = metaAbstract
        metaInspire.abstractNote = abstractInspire[0].value
        if (abstractInspire.length > 0) for (let i = 0; i < abstractInspire.length; i++) {
          if (abstractInspire[i].source === "arXiv") {
            (metaInspire.abstractNote = abstractInspire[i].value);
            break;
          }
        }
      }

      metaInspire.title = meta['titles'][0].title
      // metaInspire.authors = meta['authors']
      //document_type examples: ["book"], ["article"], ["article", "conference paper"], ["proceedings"], ["book chapter"]
      metaInspire.document_type = meta['document_type']
      // there are more than one citkeys for some items. take the first one
      metaInspire.citekey = meta['texkeys'][0]
      meta['isbns'] && (metaInspire.isbns = meta['isbns'].map((e: any) => e.value))
      if (meta['imprints']) {
        meta['imprints'][0].publisher && (metaInspire.publisher = meta['imprints'][0].publisher);
        meta['imprints'][0].date && (metaInspire.date = meta['imprints'][0].date)
      }

      metaInspire.title = meta['titles'][0].title

      var creators = [];
      /* INSPIRE tricky points:
      Not all items have 'author_count' in the metadata;
      some authors have only full_name, instead of last_name and first_name;
      some items even do not have `authors`
      */
      const metaCol = meta['collaborations']
      metaCol && (metaInspire.collaborations = metaCol.map((e: any) => e.value))

      const metaAuthors = meta['authors']
      if (metaAuthors) {
        const authorCount = meta['author_count'] || metaAuthors.length;
        let maxAuthorCount = authorCount;
        // keep only 3 authors if there are more than 10
        if (authorCount > 10) (maxAuthorCount = 3);

        let authorName = [, ""]
        for (let j = 0; j < maxAuthorCount; j++) {
          authorName = metaAuthors[j].full_name.split(', ')
          creators[j] = {
            firstName: authorName[1],
            lastName: authorName[0],
            creatorType: 'author'
          }
          metaAuthors[j].inspire_roles && (creators[j].creatorType = metaAuthors[j].inspire_roles[0])
        }

        if (authorCount > 10) {
          creators.push({
            name: 'others',
            creatorType: 'author'
          })
        }
      } else if (metaCol) {
        for (let i = 0; i < metaCol.length; i++) {
          creators[i] = {
            name: metaInspire.collaborations[i],
            creatorType: "author"
          }
        }
      }

      metaInspire.creators = creators

      const t2 = performance.now();
      Zotero.debug(`Assigning meta took ${t2 - t1} milliseconds.`)
    }
  } catch (err) {
    Zotero.debug('getInspireMeta-err: Not found in INSPIRE')
    Zotero.debug(`metaInspire: ${metaInspire}`)
    return -1;
  }

  // Zotero.debug("getInspireMeta final: ");
  // Zotero.debug(metaInspire)
  return metaInspire;
}

async function setInspireMeta(metaInspire: jsobject, operation: string) {

  let item = ZoteroPane.getSelectedItems()[0];
  const today = new Date(Date.now()).toLocaleDateString('zh-CN');
  let extra = item.getField('extra') as string
  let publication = item.getField('publicationTitle') as string
  const citekey_pref = getPref("citekey")

  // item.setField('archiveLocation', metaInspire);
  if (metaInspire.recid !== -1 && metaInspire.recid !== undefined) {
    if (operation === 'full' || operation === 'noabstract') {
      item.setField('archive', "INSPIRE");
      item.setField('archiveLocation', metaInspire.recid);

      if (metaInspire.journalAbbreviation) {
        if (item.itemType === "journalArticle") { //metaInspire.document_type[0]  === "article"
          item.setField('journalAbbreviation', metaInspire.journalAbbreviation);
        } else if (metaInspire.document_type[0] === "book" && item.itemType === "book") {
          item.setField('series', metaInspire.journalAbbreviation)
        } else {
          item.setField('publicationTitle', metaInspire.journalAbbreviation)
        }
      }
      // to avoid setting undefined to zotero items
      if (metaInspire.volume) {
        (metaInspire.document_type[0] == "book") ? item.setField('seriesNumber', metaInspire.volume) : item.setField('volume', metaInspire.volume);
      }
      if (metaInspire.pages && (metaInspire.document_type[0] !== "book")) item.setField('pages', metaInspire.pages);
      metaInspire.date && item.setField('date', metaInspire.date);
      metaInspire.issue && item.setField('issue', metaInspire.issue);
      if (metaInspire.DOI) {
        // if (metaInspire.document_type[0] === "book") {
        if (item.itemType === 'journalArticle' || item.itemType === 'preprint') {
          item.setField('DOI', metaInspire.DOI);
        } else {
          item.setField('url', "https://doi.org/" + metaInspire.DOI)
        }
      }

      if (metaInspire.isbns && !item.getField('ISBN')) item.setField('ISBN', metaInspire.isbns);
      if (metaInspire.publisher && !item.getField('publisher') && item.itemType == 'book') item.setField('publisher', metaInspire.publisher);

      /* set the title and creators if there are none */
      !item.getField('title') && item.setField('title', metaInspire.title)
      if (!item.getCreator(0) || !item.getCreator(0).firstName) item.setCreators(metaInspire.creators)

      // The current arXiv.org Zotero translator put all cross-listed categories after the ID, and the primary category is not the first. Here we replace that list by only the primary one.
      // set the arXiv url, useful to use Find Available PDF for newly added arXiv papers
      if (metaInspire.arxiv) {
        const arxivId = metaInspire.arxiv.value
        let arxivPrimeryCategory = metaInspire.arxiv.categories[0]
        let _arxivReg = new RegExp(/^.*(arXiv:|_eprint:).*$(\n|)/mgi)
        let arXivInfo = ""
        if (/^\d/.test(arxivId)) {
          arXivInfo = `arXiv:${arxivId} [${arxivPrimeryCategory}]`
        } else {
          arXivInfo = "arXiv:" + arxivId;
        }
        const numberOfArxiv = (extra.match(_arxivReg) || '').length
        // Zotero.debug(`number of arXiv lines: ${numberOfArxiv}`)
        if (numberOfArxiv !== 1) {
          // The arXiv.org translater could add two lines of arXiv to extra; remove one in that case
          extra = extra.replace(_arxivReg, '')
          // Zotero.debug(`extra w/o arxiv: ${extra}`)
          extra.endsWith('\n') ? extra += arXivInfo : extra += '\n' + arXivInfo;
          // Zotero.debug(`extra w/ arxiv: ${extra}`)
        } else {
          extra = extra.replace(/^.*(arXiv:|_eprint:).*$/mgi, arXivInfo);
          // Zotero.debug(`extra w arxiv-2: ${extra}`)
        }

        // set journalAbbr. to the arXiv ID prior to journal publication
        if (!metaInspire.journalAbbreviation) {
          item.itemType == 'journalArticle' && item.setField('journalAbbreviation', arXivInfo);
          publication.startsWith('arXiv:') && item.setField('publicationTitle', "")
        }
        const url = item.getField('url');
        (metaInspire.urlArxiv && !url) && item.setField('url', metaInspire.urlArxiv)
      }

      extra = extra.replace(/^.*type: article.*$\n/mg, '')

      if (metaInspire.collaborations && !extra.includes('tex.collaboration')) {
        extra = extra + "\n" + "tex.collaboration: " + metaInspire.collaborations.join(", ");
      }

      // Zotero.debug('setInspire-4')
      extra = setCitations(extra, metaInspire.citation_count, metaInspire.citation_count_wo_self_citations)

      if (citekey_pref === "inspire") {
        if (extra.includes('Citation Key')) {
          const initialCiteKey = (extra.match(/^.*Citation\sKey:.*$/mg) || " ")[0].split(': ')[1]
          if (initialCiteKey !== metaInspire.citekey) extra = extra.replace(/^.*Citation\sKey.*$/mg, `Citation Key: ${metaInspire.citekey}`);
        } else {
          extra += "\nCitation Key: " + metaInspire.citekey
        }
      }

    };

    if (operation === "full" && metaInspire.abstractNote) {
      item.setField('abstractNote', metaInspire.abstractNote)
    };

    if (operation === "citations") {
      extra = setCitations(extra, metaInspire.citation_count, metaInspire.citation_count_wo_self_citations)
    }
    extra = extra.replace(/\n\n/mg, '\n')
    item.setField('extra', extra)

  }
}

function setCitations(extra: string, citation_count: number, citation_count_wo_self_citations: number) {
  const today = new Date(Date.now()).toLocaleDateString('zh-CN');
  // judge whether extra has the two lines of citations
  if (/(|.*?\n)\d+\scitations[\s\S]*?\n\d+[\s\S]*?w\/o\sself[\s\S]*?/.test(extra)) {
    let temp = extra.match(/^\d+\scitations/mg)
    let existingCitations;
    if (temp !== null) {
      existingCitations = temp.map((e: any) => Number(e.replace(" citations", "")));
    } else {
      existingCitations = [0]
    }
    // Zotero.debug(`existing citations:  ${existingCitations}`)
    // if the citations are different, replace the old ones 
    // if (citation_count + citation_count_wo_self_citations !== existingCitations.reduce((a, b) => a + b)) {
    if (citation_count !== existingCitations[0] || citation_count_wo_self_citations !== existingCitations[1]) {
      extra = extra.replace(/^.*citations.*$\n/mg, "");
      extra = `${citation_count} citations (INSPIRE ${today})\n` + `${citation_count_wo_self_citations} citations w/o self (INSPIRE ${today})\n` + extra
    }
  } else {
    extra = `${citation_count} citations (INSPIRE ${today})\n` + `${citation_count_wo_self_citations} citations w/o self (INSPIRE ${today})\n` + extra
  }
  return extra
}