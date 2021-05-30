import { authCreateJWT } from "../service/auth";
import {
  githubAuthURL,
  githubFetchState,
  githubFetchUser,
} from "../service/github";
import { dataFetchUser } from "../service/database";
import BuildUrl from "build-url";
import { User } from "../types/user";
import { getRedirectCode } from "../service/redis";

export default function (fastify, _opts, next) {
  /*
  *  /login
  *  Send the user to github
  */
  fastify.get("/login", async (_request, reply) => {
    return reply
      .redirect(
        await githubAuthURL(process.env.UI_BASE_URL),
      );
  });

  /*
  * /callback
  * Process data from github
  */
  fastify.get("/callback", async (request, reply) => {
    return reply
      .redirect(
        await (async () => {
          if (!request.query["code"]) {
            return "/github/login";
          }
          if (!request.query["state"]) {
            return "/";
          }
          const access_token = await githubFetchState(
            request.query["code"].toString(),
          );

          const githubuser = await githubFetchUser(access_token);

          const user = await dataFetchUser(
            "github",
            githubuser.id.toString(),
            () =>
              User.create(
                {
                  username: githubuser.name || "",
                  avatar: githubuser.avatar_url || "",
                  bio: githubuser.bio || "",
                },
              ),
          );

          return BuildUrl(
            await getRedirectCode(request.query["state"].toString() || ""),
            {
              queryParams: {
                "token": authCreateJWT(user),
              },
            },
          );
        })(),
      );
  });

  next();
}
