import type { SessionInstance, Session } from "~/session";
import type { Fetcher } from "@literate.ink/utilities/fetcher";
import { retrieveCreatedCookies } from "@literate.ink/utilities/headers";

import { MOBILE_CHROME_USER_AGENT } from "~/constants/user-agent";
import { PronoteApiFunctions } from "~/constants/functions";
import { PawnoteNetworkFail } from "~/errors/NetworkFail";

export interface PronoteApiFunctionPayload<T> {
  nom: string
  session: number
  numeroOrdre: string

  /** `string` only when compressed and/or encrypted. */
  donneesSec: T | string
}

export const createPronoteAPICall = async (
  fetcher: Fetcher,
  apiFunctionName: PronoteApiFunctions,
  request: {
    payload: ReturnType<Session["writePronoteFunctionPayload"]>
    session_instance: SessionInstance
    cookies?: string[]
  }
) => {
  try {
    const pronote_url = request.session_instance.pronote_url;
    const function_url = pronote_url + `/appelfonction/${request.session_instance.account_type_id}/${request.session_instance.session_id}/${request.payload.order}`;
    const response = await fetcher(function_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: request.cookies?.join("; ") ?? "",
        "User-Agent": MOBILE_CHROME_USER_AGENT
      },
      body: JSON.stringify({
        session: request.session_instance.session_id,
        numeroOrdre: request.payload.order,
        nom: apiFunctionName,

        donneesSec: request.payload.data
      })
    });

    const payload = await response.text();
    const cookies = retrieveCreatedCookies(response.headers);

    return { payload, cookies };
  }
  catch {
    throw new PawnoteNetworkFail();
  }
};
