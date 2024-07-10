import type { Fetcher } from "@literate.ink/utilities/fetcher";
import { retrieveCreatedCookies } from "@literate.ink/utilities/headers";

import { MOBILE_CHROME_USER_AGENT } from "~/constants/user-agent";
import { PawnoteNetworkFail } from "~/errors/NetworkFail";

export const downloadPronotePage = async (fetcher: Fetcher, options: {
  pronoteURL: string
  cookies?: string[]
}): Promise<{
  /** Response from the page as text. */
  body: string
  /** Cookies that were set by the page. */
  cookies: string[]
}> => {
  try {
    const response = await fetcher(options.pronoteURL, {
      method: "GET",
      redirect: "manual",
      headers: {
        Cookie: options.cookies?.join("; ") ?? "",
        "User-Agent": MOBILE_CHROME_USER_AGENT
      }
    });

    return {
      cookies: retrieveCreatedCookies(response.headers),
      body: await response.text()
    };
  }
  catch (error) {
    throw new PawnoteNetworkFail();
  }
};

