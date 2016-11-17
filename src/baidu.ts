import {Observable} from 'rxjs/Observable';
import {http, Response$, timeout} from './http';
import {RedirectOnRequest} from './redirect-on-request';

interface Items$ {
  local: HTMLAnchorElement,
  remote: HTMLAnchorElement
}

function getText(htmlElement: HTMLElement): string {
  return htmlElement.innerText || htmlElement.textContent;
}

class Query {
  object: any = {};

  constructor(public queryStr: String) {
    this.object = this.toObject(queryStr.replace(/^\?+/, ''));
  }

  toObject(queryStr: String) {
    let obj = {};
    queryStr.split('&').forEach((item)=> {
      let arr = item.split('=') || [];
      let key = arr[0] || '';
      obj[key] = arr[1] || '';
    });
    return obj;
  }

  public toString(): String {
    let arr = [];
    for (let key in this.object) {
      if (this.object.hasOwnProperty(key)) {
        let value = this.object[key];
        arr.push(key + '=' + value);
      }
    }
    return '?' + arr.join('&');
  }

}

class BaiduRedirect extends RedirectOnRequest {
  constructor(domainTester, urlTester, matcher, ASelector = 'a') {
    super(domainTester, urlTester, matcher, ASelector);
  }

  handlerAll(): void {
    if (!/www\.baidu\.com\/s/.test(window.top.location.href)) return;
    const query = new Query(window.top.location.search);
    const skip = query.object.pn || 0;

    query.object.tn = 'baidulocal';
    query.object.timestamp = new Date().getTime();
    query.object.rn = 50;

    const url: string = `${location.protocol.replace(/:/,'')}://${location.host + location.pathname + query}`;

    Observable.forkJoin(
      http.get(url),
      http.get(url.replace(/pn=(\d+)/, `pn=${skip + 10}`))
    ).retry(2)
      .timeout(timeout)
      .subscribe((resList: Response$[]): void => {
        if (!resList || !resList.length) return;
        resList.forEach(res=> {
          return this.handlerAllOne(res);
        });
      });
  }

  handlerAllOne(res: Response$): void {
    let responseText: string = res.responseText.replace(/(src=[^>]*|link=[^>])/g, '');
    let html: HTMLHtmlElement = document.createElement('html');
    html.innerHTML = responseText;
    Observable.of(html.querySelectorAll('.f>a'))
      .map((nodeList)=> [].slice.call(nodeList).map(function (ele) {
        let local = [].slice.call(document.querySelectorAll('.t>a')).find((remoteEle: HTMLAnchorElement)=>getText(remoteEle) === getText(ele));
        return local ? {local, remote: ele} : void 0;
      })
        .filter(v=>!!v))
      .subscribe((items: Items$[]): void => {
        items.filter(item=> {
          return !this.urlTester.test(item.remote.href);
        })
          .forEach((item)=> {
            item.local.href = item.remote.href;
            item.local.setAttribute(this.status.done, '1');
            this.DEBUG && (item.local.style.backgroundColor = 'red');
          })
      });
  }

}

export default new BaiduRedirect(
  /www\.baidu\.com/,
  /www\.baidu\.com\/link\?url=/,
  null,
  '#content_left a'
);