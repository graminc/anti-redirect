import {RedirectOnUrl} from '../lib/redirect-on-url';

class ZhihuRedirect extends RedirectOnUrl {
  constructor(domainTester, urlTester, matcher) {
    super(domainTester, urlTester, matcher);
  }
}

export default new ZhihuRedirect(
  /www\.zhihu\.com/,
  /zhihu\.com\/\?target=/,
  /zhihu\.com\/\?target=(.*)/
)