module.exports=function(){
const _Vue = Vue
const { createVNode: _createVNode, createElementVNode: _createElementVNode, createCommentVNode: _createCommentVNode, createTextVNode: _createTextVNode } = _Vue

const _hoisted_1 = {
  class: "card",
  style: {"margin-bottom":"16px"}
}
const _hoisted_2 = { class: "card-body" }
const _hoisted_3 = { style: {"display":"flex","gap":"9px"} }
const _hoisted_4 = { style: {"position":"relative","display":"flex","align-items":"center","flex":"1"} }
const _hoisted_5 = ["onUpdate:modelValue", "placeholder", "onKeydown"]
const _hoisted_6 = ["onClick"]
const _hoisted_7 = { style: {"display":"flex","align-items":"center","gap":"10px","margin-top":"11px","flex-wrap":"wrap"} }
const _hoisted_8 = { class: "seg" }
const _hoisted_9 = ["onClick"]
const _hoisted_10 = ["onClick"]
const _hoisted_11 = ["onClick"]
const _hoisted_12 = ["onClick"]
const _hoisted_13 = ["onClick"]
const _hoisted_14 = {
  key: 0,
  class: "seg"
}
const _hoisted_15 = ["onClick"]
const _hoisted_16 = ["onClick"]
const _hoisted_17 = ["onClick"]
const _hoisted_18 = { class: "xs dimmer mono" }
const _hoisted_19 = {
  key: 0,
  class: "banner banner-bad",
  style: {"margin-bottom":"14px"}
}
const _hoisted_20 = {
  key: 1,
  class: "empty",
  style: {"padding":"60px 20px"}
}
const _hoisted_21 = { key: 2 }
const _hoisted_22 = { style: {"display":"flex","align-items":"center","gap":"8px","margin-bottom":"11px"} }
const _hoisted_23 = { class: "mono-num" }
const _hoisted_24 = {
  key: 0,
  class: "badge badge-warn"
}
const _hoisted_25 = { class: "card" }
const _hoisted_26 = {
  key: 0,
  class: "row-list"
}
const _hoisted_27 = ["href"]
const _hoisted_28 = { class: "row-main" }
const _hoisted_29 = { class: "row-title" }
const _hoisted_30 = { class: "t" }
const _hoisted_31 = {
  key: 0,
  class: "badge"
}
const _hoisted_32 = {
  key: 1,
  class: "badge"
}
const _hoisted_33 = {
  key: 0,
  class: "dim",
  style: {"font-size":"12.5px","margin-top":"3px"}
}
const _hoisted_34 = { class: "row-meta" }
const _hoisted_35 = { key: 1 }
const _hoisted_36 = { class: "row-side" }
const _hoisted_37 = { class: "stars" }
const _hoisted_38 = {
  class: "stars",
  style: {"color":"var(--ink-4)"}
}
const _hoisted_39 = {
  key: 1,
  class: "row-list"
}
const _hoisted_40 = ["href"]
const _hoisted_41 = { class: "row-main" }
const _hoisted_42 = { class: "row-title" }
const _hoisted_43 = {
  class: "t mono",
  style: {"font-size":"12.5px"}
}
const _hoisted_44 = { class: "row-meta" }
const _hoisted_45 = { key: 0 }
const _hoisted_46 = { class: "mono" }
const _hoisted_47 = {
  key: 2,
  class: "row-list"
}
const _hoisted_48 = ["href"]
const _hoisted_49 = { class: "row-main" }
const _hoisted_50 = { class: "row-title" }
const _hoisted_51 = { class: "t" }
const _hoisted_52 = { class: "row-meta" }
const _hoisted_53 = { key: 0 }
const _hoisted_54 = { key: 1 }
const _hoisted_55 = { class: "row-side" }
const _hoisted_56 = {
  key: 3,
  class: "row-list"
}
const _hoisted_57 = ["href"]
const _hoisted_58 = { class: "row-main" }
const _hoisted_59 = { class: "row-title" }
const _hoisted_60 = {
  class: "t",
  style: {"font-size":"13.5px"}
}
const _hoisted_61 = { class: "row-meta" }
const _hoisted_62 = { class: "mono" }
const _hoisted_63 = {
  key: 4,
  class: "row-list"
}
const _hoisted_64 = ["href"]
const _hoisted_65 = { class: "row-main" }
const _hoisted_66 = { class: "row-title" }
const _hoisted_67 = { class: "t" }
const _hoisted_68 = {
  key: 0,
  class: "badge"
}
const _hoisted_69 = { class: "row-meta" }
const _hoisted_70 = { class: "mono" }
const _hoisted_71 = {
  key: 4,
  class: "empty",
  style: {"padding":"56px 20px"}
}

return function render(_ctx, _cache) {
  with (_ctx) {
    const { createElementVNode: _createElementVNode, createTextVNode: _createTextVNode, resolveComponent: _resolveComponent, createVNode: _createVNode, vModelText: _vModelText, withKeys: _withKeys, withDirectives: _withDirectives, normalizeClass: _normalizeClass, openBlock: _openBlock, createElementBlock: _createElementBlock, createCommentVNode: _createCommentVNode, toDisplayString: _toDisplayString, renderList: _renderList, Fragment: _Fragment, createBlock: _createBlock } = _Vue

    const _component_icon = _resolveComponent("icon")
    const _component_skel_rows = _resolveComponent("skel-rows")
    const _component_avatar = _resolveComponent("avatar")
    const _component_lang_dot = _resolveComponent("lang-dot")
    const _component_rel_time = _resolveComponent("rel-time")
    const _component_state_badge = _resolveComponent("state-badge")
    const _component_pager = _resolveComponent("pager")

    return (_openBlock(), _createElementBlock("div", null, [
      _cache[61] || (_cache[61] = _createElementVNode("div", { style: {"margin-bottom":"16px"} }, [_createElementVNode("div", { class: "eyebrow" }, "检索"), _createTextVNode(), _createElementVNode("h1", { style: {"margin-top":"5px"} }, "搜索 GitHub")], -1)),
      _cache[62] || (_cache[62] = _createTextVNode()),
      _createElementVNode("div", _hoisted_1, [_createElementVNode("div", _hoisted_2, [_createElementVNode("div", _hoisted_3, [_createElementVNode("span", _hoisted_4, [_createVNode(_component_icon, {
        name: "search",
        size: 15,
        style: {"position":"absolute","left":"11px","color":"var(--ink-4)"}
      }, null, 8, ["size"]), _cache[0] || (_cache[0] = _createTextVNode()), _withDirectives(_createElementVNode("input", {
        id: "global-q",
        class: "input",
        "onUpdate:modelValue": $event => ((q) = $event),
        placeholder: ph,
        style: {"height":"38px","padding-left":"35px"},
        onKeydown: _withKeys(submit, ["enter"])
      }, null, 40, _hoisted_5), [[_vModelText, q]])]), _cache[1] || (_cache[1] = _createTextVNode()), _createElementVNode("button", {
        class: "btn btn-dark",
        style: {"height":"38px","padding":"0 18px"},
        onClick: submit
      }, "搜索", 8, _hoisted_6)]), _cache[12] || (_cache[12] = _createTextVNode()), _createElementVNode("div", _hoisted_7, [
        _createElementVNode("span", _hoisted_8, [
          _createElementVNode("button", {
            class: _normalizeClass({on: type==='repositories'}),
            onClick: $event => (setType('repositories'))
          }, "仓库", 10, _hoisted_9),
          _cache[2] || (_cache[2] = _createTextVNode()),
          _createElementVNode("button", {
            class: _normalizeClass({on: type==='code'}),
            onClick: $event => (setType('code'))
          }, "代码", 10, _hoisted_10),
          _cache[3] || (_cache[3] = _createTextVNode()),
          _createElementVNode("button", {
            class: _normalizeClass({on: type==='issues'}),
            onClick: $event => (setType('issues'))
          }, "议题/PR", 10, _hoisted_11),
          _cache[4] || (_cache[4] = _createTextVNode()),
          _createElementVNode("button", {
            class: _normalizeClass({on: type==='commits'}),
            onClick: $event => (setType('commits'))
          }, "提交", 10, _hoisted_12),
          _cache[5] || (_cache[5] = _createTextVNode()),
          _createElementVNode("button", {
            class: _normalizeClass({on: type==='users'}),
            onClick: $event => (setType('users'))
          }, "用户", 10, _hoisted_13)
        ]),
        _cache[8] || (_cache[8] = _createTextVNode()),
        (type==='repositories' || type==='issues')
          ? (_openBlock(), _createElementBlock("span", _hoisted_14, [
              _createElementVNode("button", {
                class: _normalizeClass({on: sort===''}),
                onClick: $event => {sort=''; run()}
              }, "最佳匹配", 10, _hoisted_15),
              _cache[6] || (_cache[6] = _createTextVNode()),
              _createElementVNode("button", {
                class: _normalizeClass({on: sort==='stars'}),
                onClick: $event => {sort='stars'; run()}
              }, "星标", 10, _hoisted_16),
              _cache[7] || (_cache[7] = _createTextVNode()),
              _createElementVNode("button", {
                class: _normalizeClass({on: sort==='updated'}),
                onClick: $event => {sort='updated'; run()}
              }, "更新", 10, _hoisted_17)
            ]))
          : _createCommentVNode("", true),
        _cache[9] || (_cache[9] = _createTextVNode()),
        _cache[10] || (_cache[10] = _createElementVNode("span", { style: {"flex":"1"} }, null, -1)),
        _cache[11] || (_cache[11] = _createTextVNode()),
        _createElementVNode("span", _hoisted_18, _toDisplayString(hint), 1)
      ])])]),
      _cache[63] || (_cache[63] = _createTextVNode()),
      err
        ? (_openBlock(), _createElementBlock("div", _hoisted_19, [_createVNode(_component_icon, {
            name: "alert",
            size: 14
          }, null, 8, ["size"]), _createElementVNode("span", null, _toDisplayString(err), 1)]))
        : _createCommentVNode("", true),
      _cache[64] || (_cache[64] = _createTextVNode()),
      (!q && !loading)
        ? (_openBlock(), _createElementBlock("div", _hoisted_20, [
            _createVNode(_component_icon, {
              name: "search",
              size: 26
            }, null, 8, ["size"]),
            _cache[13] || (_cache[13] = _createElementVNode("b", null, "输入关键词开始搜索", -1)),
            _cache[14] || (_cache[14] = _createTextVNode()),
            _cache[15] || (_cache[15] = _createElementVNode("p", null, "提示：按 / 键可以直接聚焦搜索框", -1))
          ]))
        : loading
          ? (_openBlock(), _createElementBlock("div", _hoisted_21, [_createVNode(_component_skel_rows, { n: 8 }, null, 8, ["n"])]))
          : (items.length)
            ? (_openBlock(), _createElementBlock(_Fragment, { key: 3 }, [
                _createElementVNode("div", _hoisted_22, [
                  _createElementVNode("span", _hoisted_23, _toDisplayString(U.num(total)), 1),
                  _cache[16] || (_cache[16] = _createTextVNode()),
                  _cache[17] || (_cache[17] = _createElementVNode("span", { class: "sm dim" }, "条结果", -1)),
                  _cache[18] || (_cache[18] = _createTextVNode()),
                  incomplete
                    ? (_openBlock(), _createElementBlock("span", _hoisted_24, "结果可能不完整"))
                    : _createCommentVNode("", true)
                ]),
                _cache[56] || (_cache[56] = _createTextVNode()),
                _createElementVNode("div", _hoisted_25, [(type==='repositories')
                  ? (_openBlock(), _createElementBlock("div", _hoisted_26, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(items, (it) => {
                      return (_openBlock(), _createElementBlock("a", {
                        key: it.id,
                        class: "row",
                        href: repoHref(it)
                      }, [
                        _createVNode(_component_avatar, {
                          src: it.owner && it.owner.avatar_url,
                          alt: it.owner && it.owner.login,
                          size: 24,
                          square: ""
                        }, null, 8, ["src", "alt", "size"]),
                        _cache[27] || (_cache[27] = _createTextVNode()),
                        _createElementVNode("div", _hoisted_28, [
                          _createElementVNode("div", _hoisted_29, [
                            _createElementVNode("span", _hoisted_30, _toDisplayString(it.full_name), 1),
                            _cache[20] || (_cache[20] = _createTextVNode()),
                            (it.private)
                              ? (_openBlock(), _createElementBlock("span", _hoisted_31, [_createVNode(_component_icon, {
                                  name: "lock",
                                  size: 10
                                }, null, 8, ["size"]), _cache[19] || (_cache[19] = _createTextVNode("私有"))]))
                              : _createCommentVNode("", true),
                            _cache[21] || (_cache[21] = _createTextVNode()),
                            (it.fork)
                              ? (_openBlock(), _createElementBlock("span", _hoisted_32, "fork"))
                              : _createCommentVNode("", true)
                          ]),
                          _cache[24] || (_cache[24] = _createTextVNode()),
                          (it.description)
                            ? (_openBlock(), _createElementBlock("div", _hoisted_33, _toDisplayString(it.description), 1))
                            : _createCommentVNode("", true),
                          _cache[25] || (_cache[25] = _createTextVNode()),
                          _createElementVNode("div", _hoisted_34, [(it.language)
                            ? (_openBlock(), _createBlock(_component_lang_dot, {
                                key: 0,
                                lang: it.language
                              }, null, 8, ["lang"]))
                            : _createCommentVNode("", true), _cache[23] || (_cache[23] = _createTextVNode()), (it.updated_at)
                            ? (_openBlock(), _createElementBlock("span", _hoisted_35, [_cache[22] || (_cache[22] = _createTextVNode("· ")), _createVNode(_component_rel_time, { iso: it.updated_at }, null, 8, ["iso"])]))
                            : _createCommentVNode("", true)])
                        ]),
                        _cache[28] || (_cache[28] = _createTextVNode()),
                        _createElementVNode("div", _hoisted_36, [_createElementVNode("span", _hoisted_37, [_createVNode(_component_icon, {
                          name: "star",
                          size: 12
                        }, null, 8, ["size"]), _createTextVNode(_toDisplayString(U.compact(it.stargazers_count)), 1)]), _cache[26] || (_cache[26] = _createTextVNode()), _createElementVNode("span", _hoisted_38, [_createVNode(_component_icon, {
                          name: "fork",
                          size: 12
                        }, null, 8, ["size"]), _createTextVNode(_toDisplayString(U.compact(it.forks_count)), 1)])])
                      ], 8, _hoisted_27))
                    }), 128))]))
                  : (type==='code')
                    ? (_openBlock(), _createElementBlock("div", _hoisted_39, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(items, (it, i) => {
                        return (_openBlock(), _createElementBlock("a", {
                          key: i,
                          class: "row",
                          href: '#/' + it.repository.full_name + '/blob/HEAD/' + it.path
                        }, [
                          _createVNode(_component_icon, {
                            name: "file",
                            size: 15,
                            style: {"color":"var(--ink-4)","margin-top":"2px"}
                          }, null, 8, ["size"]),
                          _cache[31] || (_cache[31] = _createTextVNode()),
                          _createElementVNode("div", _hoisted_41, [_createElementVNode("div", _hoisted_42, [_createElementVNode("span", _hoisted_43, _toDisplayString(it.path), 1)]), _cache[30] || (_cache[30] = _createTextVNode()), _createElementVNode("div", _hoisted_44, [
                            _createElementVNode("span", null, _toDisplayString(it.repository.full_name), 1),
                            _cache[29] || (_cache[29] = _createTextVNode()),
                            (it.name)
                              ? (_openBlock(), _createElementBlock("span", _hoisted_45, "·"))
                              : _createCommentVNode("", true),
                            _createElementVNode("span", _hoisted_46, _toDisplayString(it.name), 1)
                          ])]),
                          _cache[32] || (_cache[32] = _createTextVNode()),
                          _createVNode(_component_icon, {
                            name: "right",
                            size: 14,
                            style: {"color":"var(--rule-3)"}
                          }, null, 8, ["size"])
                        ], 8, _hoisted_40))
                      }), 128))]))
                    : (type==='issues')
                      ? (_openBlock(), _createElementBlock("div", _hoisted_47, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(items, (it) => {
                          return (_openBlock(), _createElementBlock("a", {
                            key: it.id,
                            class: "row",
                            href: issueHref(it)
                          }, [
                            _createVNode(_component_state_badge, {
                              kind: it.pull_request ? 'pr' : 'issue',
                              state: it.state,
                              draft: it.draft,
                              "merged-at": it.pull_request && it.pull_request.merged_at
                            }, null, 8, ["kind", "state", "draft", "merged-at"]),
                            _cache[42] || (_cache[42] = _createTextVNode()),
                            _createElementVNode("div", _hoisted_49, [_createElementVNode("div", _hoisted_50, [_createElementVNode("span", _hoisted_51, _toDisplayString(it.title), 1)]), _cache[41] || (_cache[41] = _createTextVNode()), _createElementVNode("div", _hoisted_52, [
                              _createElementVNode("span", null, _toDisplayString((it.repository_url || "").replace(/.*repos//, "")), 1),
                              _cache[33] || (_cache[33] = _createTextVNode()),
                              _cache[34] || (_cache[34] = _createElementVNode("span", null, "·", -1)),
                              _createElementVNode("span", null, "#" + _toDisplayString(it.number), 1),
                              _cache[35] || (_cache[35] = _createTextVNode()),
                              _cache[36] || (_cache[36] = _createElementVNode("span", null, "·", -1)),
                              _createElementVNode("span", null, _toDisplayString(it.user && it.user.login), 1),
                              _cache[37] || (_cache[37] = _createTextVNode()),
                              _cache[38] || (_cache[38] = _createElementVNode("span", null, "·", -1)),
                              _createVNode(_component_rel_time, { iso: it.updated_at }, null, 8, ["iso"]),
                              _cache[39] || (_cache[39] = _createTextVNode()),
                              (it.comments)
                                ? (_openBlock(), _createElementBlock("span", _hoisted_53, "·"))
                                : _createCommentVNode("", true),
                              _cache[40] || (_cache[40] = _createTextVNode()),
                              (it.comments)
                                ? (_openBlock(), _createElementBlock("span", _hoisted_54, [_createVNode(_component_icon, {
                                    name: "comment",
                                    size: 11
                                  }, null, 8, ["size"]), _createTextVNode(" " + _toDisplayString(it.comments), 1)]))
                                : _createCommentVNode("", true)
                            ])]),
                            _cache[43] || (_cache[43] = _createTextVNode()),
                            _createElementVNode("div", _hoisted_55, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList((it.labels || []).slice(0,3), (l) => {
                              return (_openBlock(), _createElementBlock("span", {
                                key: l.id,
                                class: "lbl lbl-tag"
                              }, _toDisplayString(l.name), 1))
                            }), 128))])
                          ], 8, _hoisted_48))
                        }), 128))]))
                      : (type==='commits')
                        ? (_openBlock(), _createElementBlock("div", _hoisted_56, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(items, (it) => {
                            return (_openBlock(), _createElementBlock("a", {
                              key: it.sha,
                              class: "row",
                              href: '#/' + it.repository.full_name + '/commit/' + it.sha
                            }, [_createVNode(_component_avatar, {
                              src: it.author && it.author.avatar_url,
                              alt: it.author && it.author.login,
                              size: 22,
                              square: ""
                            }, null, 8, ["src", "alt", "size"]), _cache[51] || (_cache[51] = _createTextVNode()), _createElementVNode("div", _hoisted_58, [_createElementVNode("div", _hoisted_59, [_createElementVNode("span", _hoisted_60, _toDisplayString(U.firstLine(it.commit.message, 96)), 1)]), _cache[50] || (_cache[50] = _createTextVNode()), _createElementVNode("div", _hoisted_61, [
                              _createElementVNode("span", null, _toDisplayString(it.repository.full_name), 1),
                              _cache[44] || (_cache[44] = _createElementVNode("span", null, "·", -1)),
                              _cache[45] || (_cache[45] = _createTextVNode()),
                              _createElementVNode("span", _hoisted_62, _toDisplayString((it.sha || "").slice(0, 7)), 1),
                              _cache[46] || (_cache[46] = _createElementVNode("span", null, "·", -1)),
                              _cache[47] || (_cache[47] = _createTextVNode()),
                              _createElementVNode("span", null, _toDisplayString((it.commit.author || {}).name), 1),
                              _cache[48] || (_cache[48] = _createElementVNode("span", null, "·", -1)),
                              _cache[49] || (_cache[49] = _createTextVNode()),
                              _createVNode(_component_rel_time, { iso: (it.commit.author || {}).date }, null, 8, ["iso"])
                            ])])], 8, _hoisted_57))
                          }), 128))]))
                        : (_openBlock(), _createElementBlock("div", _hoisted_63, [(_openBlock(true), _createElementBlock(_Fragment, null, _renderList(items, (it) => {
                            return (_openBlock(), _createElementBlock("a", {
                              key: it.id,
                              class: "row",
                              href: '#/users/' + it.login
                            }, [
                              _createVNode(_component_avatar, {
                                src: it.avatar_url,
                                alt: it.login,
                                size: 30
                              }, null, 8, ["src", "alt", "size"]),
                              _cache[54] || (_cache[54] = _createTextVNode()),
                              _createElementVNode("div", _hoisted_65, [_createElementVNode("div", _hoisted_66, [_createElementVNode("span", _hoisted_67, _toDisplayString(it.login), 1), _cache[52] || (_cache[52] = _createTextVNode()), (it.type === 'Organization')
                                ? (_openBlock(), _createElementBlock("span", _hoisted_68, "组织"))
                                : _createCommentVNode("", true)]), _cache[53] || (_cache[53] = _createTextVNode()), _createElementVNode("div", _hoisted_69, [_createElementVNode("span", _hoisted_70, "uid " + _toDisplayString(it.id), 1)])]),
                              _cache[55] || (_cache[55] = _createTextVNode()),
                              _createVNode(_component_icon, {
                                name: "right",
                                size: 14,
                                style: {"color":"var(--rule-3)"}
                              }, null, 8, ["size"])
                            ], 8, _hoisted_64))
                          }), 128))]))]),
                _cache[57] || (_cache[57] = _createTextVNode()),
                _createVNode(_component_pager, {
                  page: page,
                  "has-next": hasNext,
                  "has-prev": hasPrev,
                  label: U.num(total) + ' 条',
                  onGo: go
                }, null, 8, ["page", "has-next", "has-prev", "label", "onGo"])
              ], 64))
            : (_openBlock(), _createElementBlock("div", _hoisted_71, [
                _createVNode(_component_icon, {
                  name: "filter",
                  size: 24
                }, null, 8, ["size"]),
                _cache[58] || (_cache[58] = _createElementVNode("b", null, "没有找到结果", -1)),
                _cache[59] || (_cache[59] = _createTextVNode()),
                _cache[60] || (_cache[60] = _createElementVNode("p", null, "换个关键词，或减少限定条件试试", -1))
              ]))
    ]))
  }
}
}