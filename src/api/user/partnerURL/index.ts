import type { PronoteApiUserPartnerURL, ApiUserPartnerURL } from "./types";

import { PronoteApiFunctions } from "~/constants/functions";
import { PronoteApiOnglets } from "~/constants/onglets";
import { createPronoteAPICall } from "~/pronote/requestAPI";
import { makeApiHandler } from "~/utils/api";

export const callApiUserPartnerURL = makeApiHandler<ApiUserPartnerURL>(async (fetcher, input) => {
  const request_payload = input.session.writePronoteFunctionPayload<PronoteApiUserPartnerURL["request"]>({
    _Signature_: {
      onglet: PronoteApiOnglets.Presence
    },

    donnees: {
      SSO: input.sso
    }
  });

  const response = await createPronoteAPICall(fetcher, PronoteApiFunctions.PartnerURL, {
    session_instance: input.session.instance,
    payload: request_payload
  });

  const received = input.session.readPronoteFunctionPayload<PronoteApiUserPartnerURL["response"]>(response.payload);
  return { url: received.RapportSaisie.urlSSO.V };
});
