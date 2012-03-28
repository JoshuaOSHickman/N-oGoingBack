(ns NoGoingBack.core
  (:use ring.adapter.jetty ring.middleware.reload
        ring.middleware.cookies ring.middleware.content-type
        ring.middleware.params ring.middleware.keyword-params
        ring.middleware.stacktrace ring.middleware.lint))

(defn base-app [req]
  {:status 404
   :headers {"Content-Type" "text/html"}
   :body "Sorry, we really couldn't find what you were looking for."})

(defn wrap-redirect [app method route-changes]
  (fn [req]
    (if-let [new-route (and (= method (:request-method req))
                            (route-changes (:uri req)))]
      (app (assoc req :uri new-route))
      (app req))))

(defn wrap-static-files [app static-root]
  (fn [req]
    (let [f (java.io.File. (str static-root (:uri req)))]
      (if (.exists f)
        {:status 200 :body f :headers {}}
        (app req)))))

(def handler
  (-> base-app
      (wrap-static-files "static")
      wrap-content-type
      (wrap-redirect :get {"/" "/html/home.html"
                           "" "/html/home.html"})))

(def app
  (-> handler
      wrap-reload ; dev only
      wrap-params
      wrap-keyword-params
      wrap-cookies
      ;; optional/development only
      wrap-stacktrace
      wrap-lint
      ))

(defn -main []
  (run-jetty app {:port 8080}))