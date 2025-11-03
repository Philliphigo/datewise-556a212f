import SwiftUI

struct GlassyCardView: View {
    var body: some View {
        VStack {
            Text("Hello, World!")
                .font(.largeTitle)
                .padding()
        }
        .background(VisualEffectBlur(blurStyle: .systemMaterialLight))
        .cornerRadius(20)
        .shadow(radius: 10)
    }
}