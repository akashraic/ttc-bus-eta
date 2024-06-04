import { EtaPredictionJson, EtaPredictions } from "../../models/etaJson.js";
import {
  LineStopEta,
  StopBookmark,
  stopBookmarkWithEta,
} from "../../models/etaObjects.js";
import { parseSingleOrMultiEta } from "./etaParserUtils.js";
import { parseRoute } from "./routeName.js";

const parseActualLineNum = (title: string) => {
  const found = title.match(/(\w+)-([\w\s]+)/);
  if (found === null) {
    return "";
  } else return found[1].toLocaleUpperCase();
};

const parseEtaPredictions = (stop: EtaPredictions, result: LineStopEta[]) => {
  result.push({
    line: parseActualLineNum(stop.routeTitle),
    stopName: stop.stopTitle,
    routeName: parseRoute(stop.routeTitle),
    etas: [],
    stopTag: parseInt(stop.stopTag),
  });
  if (stop.dirTitleBecauseNoPredictions === undefined) {
    if (Array.isArray(stop.direction)) {
      for (const direction of stop.direction) {
        parseSingleOrMultiEta(direction.prediction, result);
      }
    } else {
      parseSingleOrMultiEta(stop.direction.prediction, result);
    }
  }
};

export const multiStopParser = (json: EtaPredictionJson) => {
  const result: LineStopEta[] = [];
  if (json.predictions) {
    if (Array.isArray(json.predictions)) {
      for (const stop of json.predictions) {
        parseEtaPredictions(stop, result);
      }
    } else {
      parseEtaPredictions(json.predictions, result);
    }
  }
  return result;
};

export function multiStopUnifier(
  json: EtaPredictionJson,
  stopBookmarks: StopBookmark[]
) {
  const result = multiStopParser(json);

  // phase 2: combine a/c to stop number
  const unifiedList: stopBookmarkWithEta[] = stopBookmarks.map(
    (stopBookmark) => {
      const enabled = stopBookmark.enabled;

      return {
        stopId: stopBookmark.stopId,
        name: stopBookmark.name,
        enabled,
        lines: enabled?.length ? enabled : stopBookmark.lines,
        ttcId: stopBookmark.ttcId,
        etas: [],
        type: stopBookmark.type,
      };
    }
  );

  for (const item of result) {
    const matchingStop = unifiedList.findIndex(
      (searching) => item.stopTag === searching.ttcId
    );
    unifiedList[matchingStop].etas = unifiedList[matchingStop].etas
      .concat(item.etas)
      .sort((a, b) => a.epochTime - b.epochTime);
  }
  return unifiedList;
}
